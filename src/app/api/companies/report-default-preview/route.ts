import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { summarizeReportFactorProvenance } from '@/lib/reports/factor-provenance';
import {
  buildReportBoundaryMetadata,
  buildReportMethodologyMetadata,
} from '@/lib/reports/report-metadata';
import {
  buildTransactionDateRange,
  formatMonthlyReportingPeriod,
} from '@/lib/reports/reporting-period';
import { getEffectiveCompanyId, requireApiSession } from '@/lib/server/auth';
import { sanitizeCompanyReportDefaults } from '@/lib/server/company-report-defaults';
import { buildReviewerSnapshot, parseReviewerIds } from '@/lib/server/report-governance';
import type {
  OrganizationalBoundaryMethod,
  ReportMode,
  Scope2Method,
} from '@/lib/types';

function getCurrentReportingPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const companyId = getEffectiveCompanyId(auth.session);
    const defaults = sanitizeCompanyReportDefaults(body);

    const latestEntry = await db.carbonLedgerEntry.findFirst({
      where: { companyId },
      select: { transactionDate: true },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    });

    const reportingPeriod = latestEntry?.transactionDate
      ? formatMonthlyReportingPeriod(latestEntry.transactionDate)
      : getCurrentReportingPeriod();
    const entries = await db.carbonLedgerEntry.findMany({
      where: {
        companyId,
        transactionDate: buildTransactionDateRange(reportingPeriod),
      },
      include: {
        department: true,
      },
    });

    const factorProvenance = summarizeReportFactorProvenance(entries);
    const reportMode = (defaults.defaultReportMode || 'internal_management') as ReportMode;
    const reviewerIds = parseReviewerIds(defaults.defaultReportReviewerIds);
    const reviewerUsers =
      reviewerIds.length > 0
        ? await db.user.findMany({
            where: {
              id: { in: reviewerIds },
              companyId,
            },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })
        : [];
    const reviewerSnapshot = buildReviewerSnapshot(reviewerUsers);
    const scope2LocationBasedEmissions = Number(
      entries
        .filter((entry) => entry.category === 'Scope 2')
        .reduce((sum, entry) => sum + entry.co2Equivalent, 0)
        .toFixed(2)
    );
    const methodologyMetadata = buildReportMethodologyMetadata({
      factorProvenanceSummary: factorProvenance.summaryText,
      reportOwnerName: defaults.defaultReportOwnerName || auth.session.userName,
      reportOwnerEmail: defaults.defaultReportOwnerEmail || auth.session.userEmail,
      reviewerNames: reviewerSnapshot.reviewerNames,
      reportingStandard: defaults.defaultReportingStandard || undefined,
      gwpBasis: defaults.defaultGwpBasis || undefined,
      factorSourcePolicy: defaults.defaultFactorSourcePolicy || undefined,
      overridePolicy: defaults.defaultOverridePolicy || undefined,
      annualDisclosureNotes: defaults.annualDisclosureNotes || undefined,
      reportRecipients:
        reviewerSnapshot.recipientEmails.length > 0
          ? reviewerSnapshot.recipientEmails.join(', ')
          : defaults.defaultReportRecipients || undefined,
      approvalWorkflow: defaults.defaultApprovalWorkflow || undefined,
      approvalStatus: 'pending_review',
      reportMode,
      baseYear: defaults.defaultBaseYear ?? undefined,
      baseYearNotes: defaults.defaultBaseYearNotes || undefined,
      baseYearRecalculationPolicy:
        defaults.defaultBaseYearRecalculationPolicy || undefined,
      scope2Method: defaults.defaultScope2Method as Scope2Method | undefined,
      scope2LocationBasedEmissions,
      scope2MarketBasedEmissions:
        defaults.defaultScope2MarketBasedEmissions ?? undefined,
      scope2DisclosureNotes: defaults.defaultScope2DisclosureNotes || undefined,
      scope2InstrumentNotes: defaults.defaultScope2InstrumentNotes || undefined,
    });
    const boundaryMetadata = buildReportBoundaryMetadata(entries, reportingPeriod, {
      organizationalBoundaryMethod:
        defaults.defaultOrganizationalBoundaryMethod as
          | OrganizationalBoundaryMethod
          | undefined,
      organizationalBoundaryNotes:
        defaults.defaultOrganizationalBoundaryNotes || undefined,
    });

    return NextResponse.json({
      reportMode,
      reportingPeriod,
      methodologyMetadata,
      boundaryMetadata,
      factorProvenanceSummary: factorProvenance.summaryText,
      entryCount: entries.length,
    });
  } catch (error) {
    console.error('Error building report defaults preview:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to build report defaults preview' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}
