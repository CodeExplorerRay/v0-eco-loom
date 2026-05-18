import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recalculateGoalProgress } from '@/lib/sync-service';
import {
  assertCompanyAccess,
  canEditLedgerEntry,
  isAdmin,
  requireApiSession,
} from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';
import {
  findMatchingLedgerEntry,
  getLedgerDuplicateErrorMessage,
} from '@/lib/server/ledger-duplicates';
import { resolveApprovedLedgerCalculation } from '@/lib/server/ledger-factors';
import { syncLedgerEntriesToNotion } from '@/lib/server/notion-sync';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import type { LedgerFactorOverrideInput, SourceType } from '@/lib/types';

// GET - Fetch a specific ledger entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;
  
  try {
    const entry = await db.carbonLedgerEntry.findUnique({
      where: { id },
      include: { department: true, appliedEmissionFactor: true },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const companyError = assertCompanyAccess(auth.session, entry.companyId);
    if (companyError) {
      return companyError;
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error fetching entry:', error);
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
  }
}

// PATCH - Update a ledger entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;
  
  try {
    const existing = await db.carbonLedgerEntry.findUnique({
      where: { id },
      include: { appliedEmissionFactor: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const companyError = assertCompanyAccess(auth.session, existing.companyId);
    if (companyError) {
      return companyError;
    }

    if (!canEditLedgerEntry(auth.session, existing)) {
      return NextResponse.json(
        { error: 'You can only edit entries you created unless you are an admin' },
        { status: 403 }
      );
    }

    if (existing.factorOverridden && !isAdmin(auth.session)) {
      return NextResponse.json(
        { error: 'Only admins can edit entries with custom factor overrides' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      activityValue,
      notes,
      description,
      sourceDocument,
      factorOverride,
      factorRegion,
      factorYear,
      region,
      year,
    } = body;

    const updateData: Record<string, unknown> = {};
    let recalculationAuditDetails: Record<string, unknown> | null = null;
    let factorOverrideInput: LedgerFactorOverrideInput | null | undefined;
    let explicitFactorRegion: string | null | undefined;
    let explicitFactorYear: number | undefined;
    let effectiveActivityValue = existing.activityValue;
    let effectiveCategory = existing.category;

    if (factorRegion !== undefined || region !== undefined) {
      const rawRegion = factorRegion ?? region;
      explicitFactorRegion =
        typeof rawRegion === 'string' && rawRegion.trim().length > 0 ? rawRegion.trim() : null;
    }

    if (factorYear !== undefined || year !== undefined) {
      const rawYear = factorYear ?? year;
      if (rawYear === null || rawYear === '') {
        explicitFactorYear = undefined;
      } else {
        explicitFactorYear = Number.parseInt(String(rawYear), 10);
        if (!Number.isInteger(explicitFactorYear)) {
          return NextResponse.json({ error: 'Factor year must be a valid integer' }, { status: 400 });
        }
      }
    }

    if (factorOverride !== undefined) {
      if (!isAdmin(auth.session)) {
        return NextResponse.json(
          { error: 'Only admins can apply custom factor overrides' },
          { status: 403 }
        );
      }

      if (factorOverride === null) {
        factorOverrideInput = null;
      } else {
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
    }
    
    const shouldRecalculate =
      activityValue !== undefined ||
      factorOverrideInput !== undefined ||
      explicitFactorRegion !== undefined ||
      explicitFactorYear !== undefined;

    if (shouldRecalculate) {
      const parsedActivityValue =
        activityValue !== undefined ? parseFloat(activityValue) : existing.activityValue;
      if (!Number.isFinite(parsedActivityValue) || parsedActivityValue < 0) {
        return NextResponse.json(
          { error: 'Activity value must be a valid non-negative number' },
          { status: 400 }
        );
      }

      const effectiveFactorRegion =
        explicitFactorRegion !== undefined ? explicitFactorRegion || undefined : existing.factorRegion ?? undefined;
      const effectiveFactorYear =
        explicitFactorYear !== undefined ? explicitFactorYear : existing.factorYear ?? undefined;

      let approvedCalculation;
      try {
        const effectiveOverride =
          factorOverrideInput !== undefined
            ? factorOverrideInput
            : existing.factorOverridden
              ? {
                  emissionFactor: existing.emissionFactor,
                  reason: existing.factorOverrideReason || 'Existing approved override',
                  source: existing.factorSource || undefined,
                  year: existing.factorYear ?? undefined,
                  methodology: existing.factorMethodology || undefined,
                  description: existing.factorDescription || undefined,
                  gwpBasis: existing.factorGwpBasis || undefined,
                }
              : null;
        approvedCalculation = await resolveApprovedLedgerCalculation({
          sourceType: existing.sourceType as SourceType,
          activityUnit: existing.activityUnit,
          activityValue: parsedActivityValue,
          region: effectiveFactorRegion,
          year: effectiveFactorYear,
          factorOverride: effectiveOverride,
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

      updateData.activityValue = parsedActivityValue;
      effectiveActivityValue = parsedActivityValue;
      updateData.category = approvedCalculation.category;
      effectiveCategory = approvedCalculation.category;
      updateData.emissionFactor = approvedCalculation.emissionFactor;
      updateData.emissionFactorUnit = approvedCalculation.emissionFactorUnit;
      updateData.emissionFactorId = approvedCalculation.factorRecord?.id ?? null;
      Object.assign(updateData, approvedCalculation.factorProvenance);
      updateData.co2Equivalent = approvedCalculation.co2Equivalent;
      recalculationAuditDetails = {
        actor: auth.session.userEmail,
        sourceType: existing.sourceType,
        activityUnit: existing.activityUnit,
        oldActivityValue: existing.activityValue,
        newActivityValue: parsedActivityValue,
        oldEmissionFactor: existing.emissionFactor,
        newEmissionFactor: approvedCalculation.emissionFactor,
        oldCo2Equivalent: existing.co2Equivalent,
        newCo2Equivalent: approvedCalculation.co2Equivalent,
        factorSource: approvedCalculation.factorProvenance.factorSource,
        factorSourceFamily: approvedCalculation.factorProvenance.factorSourceFamily,
        factorYear: approvedCalculation.factorProvenance.factorYear?.toString() ?? null,
        factorRegion: approvedCalculation.factorProvenance.factorRegion,
        factorMethodology: approvedCalculation.factorProvenance.factorMethodology,
        factorOverridden:
          factorOverrideInput !== undefined ? Boolean(factorOverrideInput) : existing.factorOverridden,
        factorOverrideReason:
          factorOverrideInput !== undefined
            ? factorOverrideInput?.reason ?? null
            : existing.factorOverrideReason,
      };
    }
    
    const normalizedNotes =
      notes !== undefined ? notes : description !== undefined ? description : undefined;

    if (normalizedNotes !== undefined) {
      updateData.notes = normalizedNotes;
    }

    if (sourceDocument !== undefined) {
      updateData.sourceDocument =
        typeof sourceDocument === 'string' && sourceDocument.trim().length > 0
          ? sourceDocument.trim()
          : null;
    }

    const effectiveSourceDocument =
      sourceDocument !== undefined
        ? typeof sourceDocument === 'string' && sourceDocument.trim().length > 0
          ? sourceDocument.trim()
          : null
        : existing.sourceDocument ?? null;

    const duplicateEntry = await findMatchingLedgerEntry({
      companyId: existing.companyId,
      departmentId: existing.departmentId,
      sourceType: existing.sourceType,
      category: effectiveCategory,
      activityValue: effectiveActivityValue,
      activityUnit: existing.activityUnit,
      transactionDate: existing.transactionDate,
      reportingPeriod: existing.reportingPeriod,
      sourceDocument: effectiveSourceDocument,
      excludeId: existing.id,
    });

    if (duplicateEntry) {
      return NextResponse.json(
        { error: getLedgerDuplicateErrorMessage(duplicateEntry) },
        { status: 409 }
      );
    }

    if (factorOverrideInput !== undefined) {
      if (factorOverrideInput) {
        updateData.factorOverridden = true;
        updateData.factorOverrideReason = factorOverrideInput.reason;
        updateData.factorOverrideAt = new Date();
        updateData.factorOverrideByUserId = auth.session.userId;
        updateData.factorOverrideByName = auth.session.userName;
      } else {
        updateData.factorOverridden = false;
        updateData.factorOverrideReason = null;
        updateData.factorOverrideAt = null;
        updateData.factorOverrideByUserId = null;
        updateData.factorOverrideByName = null;
      }
    }

    updateData.updatedByUserId = auth.session.userId;
    updateData.updatedByName = auth.session.userName;

    const entry = await db.carbonLedgerEntry.update({
      where: { id },
      data: updateData,
      include: { department: true, appliedEmissionFactor: true },
    });

    await createAuditLog(auth.session, {
      action: 'update',
      entityType: 'carbon_ledger_entry',
      entityId: id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        changes: updateData,
      }),
    });

    if (recalculationAuditDetails) {
      await createAuditLog(auth.session, {
        action:
          factorOverrideInput !== undefined
            ? factorOverrideInput
              ? 'factor_override'
              : 'factor_recalculated'
            : 'factor_recalculated',
        entityType: 'carbon_ledger_entry',
        entityId: id,
        details: JSON.stringify(recalculationAuditDetails),
      });
    }

    // Sync with goals - recalculate progress
    await recalculateGoalProgress(entry.companyId);
    const ledgerSync = await syncLedgerEntriesToNotion({
      companyId: entry.companyId,
      entryIds: [entry.id],
    });

    const refreshedEntry =
      ledgerSync.status === 'completed' && ledgerSync.result.success > 0
        ? await db.carbonLedgerEntry.findUnique({
            where: { id: entry.id },
            include: { department: true, appliedEmissionFactor: true },
          })
        : null;

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error updating entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

// DELETE - Delete a ledger entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;
  
  try {
    // Get the entry first to get companyId for syncing
    const entry = await db.carbonLedgerEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const companyError = assertCompanyAccess(auth.session, entry.companyId);
    if (companyError) {
      return companyError;
    }

    if (!isAdmin(auth.session)) {
      return NextResponse.json({ error: 'Only admins can delete ledger entries' }, { status: 403 });
    }

    if (entry.notionPageId) {
      return NextResponse.json(
        {
          error:
            'This entry is already linked to Notion. Delete or archive the Notion record first so the two systems do not drift out of sync.',
        },
        { status: 409 }
      );
    }

    await createAuditLog(auth.session, {
      action: 'delete',
      entityType: 'carbon_ledger_entry',
      entityId: id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        deletedAt: new Date().toISOString(),
      }),
    });

    await db.carbonLedgerEntry.delete({
      where: { id },
    });

    // Sync with goals - recalculate progress
    await recalculateGoalProgress(entry.companyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
