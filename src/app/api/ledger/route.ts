import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { recalculateGoalProgress } from '@/lib/sync-service';
import { assertCompanyAccess, isAdmin, requireApiSession } from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';
import { resolveApprovedLedgerCalculation } from '@/lib/server/ledger-factors';
import {
  findMatchingLedgerEntry,
  getLedgerDuplicateErrorMessage,
} from '@/lib/server/ledger-duplicates';
import { syncLedgerEntriesToNotion } from '@/lib/server/notion-sync';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { formatMonthlyReportingPeriod } from '@/lib/reports/reporting-period';
import type { LedgerFactorOverrideInput, SourceType } from '@/lib/types';

const MIN_LEDGER_PAGE_SIZE = 20;
const SUCCESSFUL_NOTION_SYNC_STATUSES = ['exported', 'updated', 'linked_existing'] as const;

// GET - Fetch all ledger entries for a company
export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const departmentId = searchParams.get('departmentId');
  const sourceType = searchParams.get('sourceType');
  const scope = searchParams.get('scope');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search');
  const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const requestedPageSize = Number.parseInt(
    searchParams.get('pageSize') || String(MIN_LEDGER_PAGE_SIZE),
    10
  );

  const companyError = assertCompanyAccess(auth.session, companyId);
  if (companyError) {
    return companyError;
  }

  try {
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize =
      Number.isFinite(requestedPageSize) && requestedPageSize > 0
        ? Math.max(requestedPageSize, MIN_LEDGER_PAGE_SIZE)
        : MIN_LEDGER_PAGE_SIZE;
    const where: Prisma.CarbonLedgerEntryWhereInput = { companyId: companyId! };
    
    if (departmentId) where.departmentId = departmentId;
    if (sourceType) where.sourceType = sourceType;
    if (scope) where.category = scope;
    if (search) {
      where.OR = [
        { sourceDocument: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { activityUnit: { contains: search, mode: 'insensitive' } },
        { sourceType: { contains: search, mode: 'insensitive' } },
        { factorSource: { contains: search, mode: 'insensitive' } },
        { factorMethodology: { contains: search, mode: 'insensitive' } },
        { department: { name: { contains: search, mode: 'insensitive' } } },
        { department: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    const [
      total,
      totalCo2eAggregate,
      verifiedCount,
      verifiedCo2eAggregate,
      notionLinkedCount,
      notionLinkReviewCount,
    ] =
      await Promise.all([
        db.carbonLedgerEntry.count({ where }),
        db.carbonLedgerEntry.aggregate({
          where,
          _sum: {
            co2Equivalent: true,
          },
        }),
        db.carbonLedgerEntry.count({
          where: {
            ...where,
            verified: true,
          },
        }),
        db.carbonLedgerEntry.aggregate({
          where: {
            ...where,
            verified: true,
          },
          _sum: {
            co2Equivalent: true,
          },
        }),
        db.carbonLedgerEntry.count({
          where: {
            ...where,
            notionPageId: {
              not: null,
            },
          },
        }),
        db.carbonLedgerEntry.count({
          where: {
            ...where,
            OR: [
              {
                notionPageId: null,
                notionSyncStatus: 'missing_remote_page',
              },
              {
                notionPageId: null,
                notionSyncedAt: {
                  not: null,
                },
                notionSyncStatus: {
                  in: [...SUCCESSFUL_NOTION_SYNC_STATUSES],
                },
              },
            ],
          },
        }),
      ]);

    const totalCo2e = Number(totalCo2eAggregate._sum.co2Equivalent ?? 0);
    const verifiedCo2e = Number(verifiedCo2eAggregate._sum.co2Equivalent ?? 0);
    const pendingCount = Math.max(total - verifiedCount, 0);
    const pendingCo2e = Math.max(totalCo2e - verifiedCo2e, 0);
    const notionPendingCount = Math.max(total - notionLinkedCount - notionLinkReviewCount, 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const entries = await db.carbonLedgerEntry.findMany({
      where,
      include: { department: true, appliedEmissionFactor: true },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      data: entries,
      total,
      page: safePage,
      pageSize,
      totalPages,
      summary: {
        entryCount: total,
        totalCo2e,
        verifiedCount,
        verifiedCo2e,
        pendingCount,
        pendingCo2e,
        notionSyncedCount: notionLinkedCount,
        notionLinkedCount,
        notionLinkReviewCount,
        notionPendingCount,
      },
    });
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

// POST - Create a new ledger entry
export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const {
      sourceType,
      sourceDocument,
      notes,
      description,
      activityValue,
      activityUnit,
      factorOverride,
      transactionDate,
      reportingPeriod,
      factorRegion,
      factorYear,
      region,
      year,
      departmentId,
      companyId,
      rawExtractedText,
      aiClassification,
    } = body;

    const companyError = assertCompanyAccess(auth.session, companyId);
    if (companyError) {
      return companyError;
    }

    if (!sourceType || activityValue === undefined || !activityUnit || !departmentId || !companyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const department = await db.department.findFirst({
      where: {
        id: departmentId,
        companyId: companyId!,
      },
      select: {
        id: true,
      },
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Selected facility does not belong to the current workspace' },
        { status: 400 }
      );
    }

    const parsedActivityValue = parseFloat(activityValue);
    if (!Number.isFinite(parsedActivityValue) || parsedActivityValue < 0) {
      return NextResponse.json(
        { error: 'Activity value must be a valid non-negative number' },
        { status: 400 }
      );
    }

    const parsedTransactionDate = transactionDate ? new Date(transactionDate) : new Date();
    if (Number.isNaN(parsedTransactionDate.getTime())) {
      return NextResponse.json({ error: 'Transaction date must be a valid date' }, { status: 400 });
    }

    const normalizedSourceDocument =
      typeof sourceDocument === 'string' && sourceDocument.trim().length > 0
        ? sourceDocument.trim()
        : null;

    const normalizedFactorRegion =
      typeof factorRegion === 'string' && factorRegion.trim().length > 0
        ? factorRegion.trim()
        : typeof region === 'string' && region.trim().length > 0
          ? region.trim()
          : undefined;
    const rawFactorYear = factorYear ?? year;
    const parsedFactorYear =
      rawFactorYear !== undefined && rawFactorYear !== null && rawFactorYear !== ''
        ? Number.parseInt(String(rawFactorYear), 10)
        : undefined;

    if (rawFactorYear !== undefined && rawFactorYear !== null && rawFactorYear !== '' && !Number.isInteger(parsedFactorYear)) {
      return NextResponse.json({ error: 'Factor year must be a valid integer' }, { status: 400 });
    }

    let factorOverrideInput: LedgerFactorOverrideInput | null = null;
    if (factorOverride !== undefined && factorOverride !== null) {
      if (!isAdmin(auth.session)) {
        return NextResponse.json(
          { error: 'Only admins can apply custom factor overrides' },
          { status: 403 }
        );
      }

      const override = factorOverride as Partial<LedgerFactorOverrideInput>;
      const parsedOverrideFactor = Number.parseFloat(String(override.emissionFactor));
      if (!Number.isFinite(parsedOverrideFactor) || parsedOverrideFactor <= 0) {
        return NextResponse.json(
          { error: 'Override factor must be a valid positive number' },
          { status: 400 }
        );
      }

      const reason = override.reason?.trim();
      if (!reason) {
        return NextResponse.json(
          { error: 'A reason is required for factor overrides' },
          { status: 400 }
        );
      }

      factorOverrideInput = {
        emissionFactor: parsedOverrideFactor,
        reason,
        source: override.source?.trim() || undefined,
        year: override.year,
        methodology: override.methodology?.trim() || undefined,
        description: override.description?.trim() || undefined,
        gwpBasis: override.gwpBasis?.trim() || undefined,
      };
    }

    let approvedCalculation;
    try {
      approvedCalculation = await resolveApprovedLedgerCalculation({
        sourceType: sourceType as SourceType,
        activityUnit,
        activityValue: parsedActivityValue,
        region: normalizedFactorRegion,
        year: parsedFactorYear,
        factorOverride: factorOverrideInput,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'No approved emission factor found for this activity',
        },
        { status: 400 }
      );
    }

    const resolvedReportingPeriod =
      typeof reportingPeriod === 'string' && reportingPeriod.trim().length > 0
        ? reportingPeriod.trim()
        : formatMonthlyReportingPeriod(parsedTransactionDate);

    const duplicateEntry = await findMatchingLedgerEntry({
      companyId: companyId!,
      departmentId,
      sourceType,
      category: approvedCalculation.category,
      activityValue: parsedActivityValue,
      activityUnit,
      transactionDate: parsedTransactionDate,
      reportingPeriod: resolvedReportingPeriod,
      sourceDocument: normalizedSourceDocument,
    });

    if (duplicateEntry) {
      return NextResponse.json(
        { error: getLedgerDuplicateErrorMessage(duplicateEntry) },
        { status: 409 }
      );
    }

    const entry = await db.carbonLedgerEntry.create({
      data: {
        sourceType,
        sourceDocument: normalizedSourceDocument,
        notes: typeof notes === 'string' ? notes : typeof description === 'string' ? description : undefined,
        category: approvedCalculation.category,
        activityValue: parsedActivityValue,
        activityUnit,
        emissionFactor: approvedCalculation.emissionFactor,
        emissionFactorUnit: approvedCalculation.emissionFactorUnit,
        emissionFactorId: approvedCalculation.factorRecord?.id,
        ...approvedCalculation.factorProvenance,
        co2Equivalent: approvedCalculation.co2Equivalent,
        co2Unit: 'kg CO2e',
        transactionDate: parsedTransactionDate,
        reportingPeriod: resolvedReportingPeriod,
        departmentId,
        companyId: companyId!,
        rawExtractedText,
        aiClassification,
        verified: false,
        createdByUserId: auth.session.userId,
        createdByName: auth.session.userName,
        updatedByUserId: auth.session.userId,
        updatedByName: auth.session.userName,
        factorOverridden: Boolean(factorOverrideInput),
        factorOverrideReason: factorOverrideInput?.reason,
        factorOverrideAt: factorOverrideInput ? new Date() : undefined,
        factorOverrideByUserId: factorOverrideInput ? auth.session.userId : undefined,
        factorOverrideByName: factorOverrideInput ? auth.session.userName : undefined,
      },
      include: { department: true, appliedEmissionFactor: true },
    });

    await createAuditLog(auth.session, {
      action: 'create',
      entityType: 'carbon_ledger_entry',
      entityId: entry.id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        sourceType,
        activityValue: entry.activityValue,
        emissionFactor: entry.emissionFactor,
        co2Equivalent: entry.co2Equivalent,
        factorRegion: entry.factorRegion,
        factorYear: entry.factorYear,
      }),
    });

    await createAuditLog(auth.session, {
      action: factorOverrideInput ? 'factor_override' : 'factor_applied',
      entityType: 'carbon_ledger_entry',
      entityId: entry.id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        sourceType: entry.sourceType,
        activityUnit: entry.activityUnit,
        emissionFactor: entry.emissionFactor,
        emissionFactorUnit: entry.emissionFactorUnit,
        factorSource: entry.factorSource,
        factorSourceFamily: entry.factorSourceFamily,
        factorYear: entry.factorYear?.toString() ?? null,
        factorRegion: entry.factorRegion,
        factorMethodology: entry.factorMethodology,
        reason: factorOverrideInput?.reason ?? null,
      }),
    });

    // Sync with goals - recalculate progress
    await recalculateGoalProgress(companyId!);
    const ledgerSync = await syncLedgerEntriesToNotion({
      companyId: companyId!,
      entryIds: [entry.id],
    });

    const refreshedEntry =
      ledgerSync.status === 'completed' && ledgerSync.result.success > 0
        ? await db.carbonLedgerEntry.findUnique({
            where: { id: entry.id },
            include: { department: true, appliedEmissionFactor: true },
          })
        : null;

    return NextResponse.json(
      {
        ...(refreshedEntry || entry),
        notionSync:
          ledgerSync.status === 'completed'
            ? ledgerSync.result.failed > 0
              ? {
                  status: 'failed',
                  reason: ledgerSync.result.errors[0]?.error || 'Notion sync failed',
                }
              : {
                  status: 'synced',
                }
            : {
                status: 'skipped',
                reason: ledgerSync.reason,
              },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating ledger entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
