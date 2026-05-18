import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildGapAnalysisGoalItems, formatGapValue } from '@/lib/gap-analysis';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';
import { summarizeReportFactorProvenance } from '@/lib/reports/factor-provenance';
import { getReportModeProfile } from '@/lib/reports/report-modes';
import {
  buildReportBoundaryMetadata,
  buildReportMethodologyMetadata,
} from '@/lib/reports/report-metadata';
import {
  buildTransactionDateRange,
  getPreviousReportingPeriod,
} from '@/lib/reports/reporting-period';
import { getReportAnalytics } from '@/lib/server/report-analytics';
import { buildReviewerSnapshot, parseReviewerIds } from '@/lib/server/report-governance';
import {
  buildFacilityScopedBoundarySummary,
  buildFacilityScopedReportTitle,
} from '@/lib/server/report-scope';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import type {
  GapAnalysisGoalItem,
  OrganizationalBoundaryMethod,
  ReportAnalyticsSummary,
  Scope2Method,
} from '@/lib/types';
import { formatCo2e } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, 'heavyWrite');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { reportType, reportMode, reportingPeriod, companyId, departmentId } = body;

    const companyError = assertCompanyAccess(auth.session, companyId);
    if (companyError) {
      return companyError;
    }

    if (!reportType || !reportingPeriod || !companyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const company = await db.company.findUnique({
      where: { id: companyId! },
      select: {
        defaultReportMode: true,
        defaultReportingStandard: true,
        defaultGwpBasis: true,
        defaultFactorSourcePolicy: true,
        defaultOverridePolicy: true,
        defaultReportOwnerName: true,
        defaultReportOwnerEmail: true,
        defaultReportReviewerIds: true,
        defaultReportRecipients: true,
        defaultApprovalWorkflow: true,
        defaultOrganizationalBoundaryMethod: true,
        defaultOrganizationalBoundaryNotes: true,
        defaultBaseYear: true,
        defaultBaseYearNotes: true,
        defaultBaseYearRecalculationPolicy: true,
        defaultScope2Method: true,
        defaultScope2MarketBasedEmissions: true,
        defaultScope2DisclosureNotes: true,
        defaultScope2InstrumentNotes: true,
        annualDisclosureNotes: true,
      },
    });

    const effectiveReportMode = reportMode || company?.defaultReportMode || 'internal_management';
    const selectedDepartment = departmentId
      ? await db.department.findFirst({
          where: {
            id: departmentId,
            companyId: companyId!,
          },
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            country: true,
          },
        })
      : null;

    if (departmentId && !selectedDepartment) {
      return NextResponse.json({ error: 'Facility / site not found' }, { status: 404 });
    }

    const baseTitleByType: Record<string, string> = {
      gap_analysis: `Gap Analysis Report - ${reportingPeriod}`,
      monthly_summary: `Monthly Summary - ${reportingPeriod}`,
      quarterly_review: `Quarterly Review - ${reportingPeriod}`,
      annual_report: `Annual Report - ${reportingPeriod}`,
    };
    const reportTitle = selectedDepartment
      ? buildFacilityScopedReportTitle(
          baseTitleByType[reportType] || `Report - ${reportingPeriod}`,
          selectedDepartment
        )
      : baseTitleByType[reportType] || `Report - ${reportingPeriod}`;

    const existingDraft = await db.report.findFirst({
      where: {
        companyId: companyId!,
        reportType,
        reportMode: effectiveReportMode,
        reportingPeriod,
        status: 'draft',
        title: reportTitle,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (existingDraft) {
      return NextResponse.json({ report: existingDraft, reused: true });
    }

    // Get entries for the reporting period
    const entries = await db.carbonLedgerEntry.findMany({
      where: {
        companyId: companyId!,
        transactionDate: buildTransactionDateRange(reportingPeriod),
        ...(selectedDepartment ? { departmentId: selectedDepartment.id } : {}),
      },
      include: { department: true },
    });

    const totalEmissions = entries.reduce((sum, e) => sum + e.co2Equivalent, 0);
    const factorProvenance = summarizeReportFactorProvenance(entries);
    const reportAnalytics = await getReportAnalytics(
      companyId!,
      reportingPeriod,
      selectedDepartment?.id
    );
    const reviewerIds = parseReviewerIds(company?.defaultReportReviewerIds);
    const reviewerUsers =
      reviewerIds.length > 0
        ? await db.user.findMany({
            where: {
              id: { in: reviewerIds },
              companyId: companyId!,
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
      reportOwnerName: company?.defaultReportOwnerName || auth.session.userName,
      reportOwnerEmail: company?.defaultReportOwnerEmail || auth.session.userEmail,
      reviewerNames: reviewerSnapshot.reviewerNames,
      reportingStandard: company?.defaultReportingStandard || undefined,
      gwpBasis: company?.defaultGwpBasis || undefined,
      factorSourcePolicy: company?.defaultFactorSourcePolicy || undefined,
      overridePolicy: company?.defaultOverridePolicy || undefined,
      annualDisclosureNotes: company?.annualDisclosureNotes || undefined,
      reportRecipients:
        reviewerSnapshot.recipientEmails.length > 0
          ? reviewerSnapshot.recipientEmails.join(', ')
          : company?.defaultReportRecipients || undefined,
      approvalWorkflow: company?.defaultApprovalWorkflow || undefined,
      approvalStatus: 'pending_review',
      reportMode: effectiveReportMode,
      baseYear: company?.defaultBaseYear ?? undefined,
      baseYearNotes: company?.defaultBaseYearNotes || undefined,
      baseYearRecalculationPolicy: company?.defaultBaseYearRecalculationPolicy || undefined,
      scope2Method: company?.defaultScope2Method as Scope2Method | undefined,
      scope2LocationBasedEmissions,
      scope2MarketBasedEmissions:
        company?.defaultScope2MarketBasedEmissions ?? undefined,
      scope2DisclosureNotes: company?.defaultScope2DisclosureNotes || undefined,
      scope2InstrumentNotes: company?.defaultScope2InstrumentNotes || undefined,
    });
    const baseBoundaryMetadata = buildReportBoundaryMetadata(entries, reportingPeriod, {
      organizationalBoundaryMethod:
        company?.defaultOrganizationalBoundaryMethod as
          | OrganizationalBoundaryMethod
          | undefined,
      organizationalBoundaryNotes:
        company?.defaultOrganizationalBoundaryNotes || undefined,
    });
    const boundaryMetadata = selectedDepartment
      ? {
          ...baseBoundaryMetadata,
          boundarySummary: buildFacilityScopedBoundarySummary(
            selectedDepartment,
            baseBoundaryMetadata.boundarySummary
          ),
          includedDepartments: [
            {
              name: selectedDepartment.name,
              code: selectedDepartment.code || null,
              address: selectedDepartment.address || null,
              country: selectedDepartment.country || null,
            },
          ],
        }
      : baseBoundaryMetadata;

    // Get previous period for comparison
    const previousPeriod = getPreviousReportingPeriod(reportingPeriod);

    const prevEntries = await db.carbonLedgerEntry.findMany({
      where: {
        companyId: companyId!,
        transactionDate: buildTransactionDateRange(previousPeriod),
        ...(selectedDepartment ? { departmentId: selectedDepartment.id } : {}),
      },
    });

    const previousPeriodEmissions = prevEntries.reduce((sum, e) => sum + e.co2Equivalent, 0);

    // Get goals for gap analysis
    const goals = await db.sustainabilityGoal.findMany({
      where: selectedDepartment
        ? {
            companyId: companyId!,
            OR: [{ departmentId: selectedDepartment.id }, { departmentId: null }],
          }
        : { companyId: companyId! },
      include: { department: true },
    });

    // Calculate gaps
    const gaps = buildGapAnalysisGoalItems(goals);

    // Generate operational insights for this report package
    const recommendations = generateOperationalInsights({
      reportType,
      reportMode: effectiveReportMode,
      gaps,
      totalEmissions,
      previousEmissions: previousPeriodEmissions,
      reportAnalytics,
      factorProvenance,
      selectedDepartmentName: selectedDepartment?.name || null,
    });

    // Generate summary
    const summary = generateSummary(
      reportType,
      effectiveReportMode,
      totalEmissions,
      previousPeriodEmissions,
      gaps,
      factorProvenance.summaryText,
      reportAnalytics,
      selectedDepartment?.name || null
    );

    const report = await db.report.create({
      data: {
        title: reportTitle,
        reportType,
        reportMode: effectiveReportMode,
        reportingPeriod,
        summary,
        totalEmissions,
        previousPeriodEmissions,
        gapsIdentified: JSON.stringify(gaps),
        recommendations,
        reportingStandard: methodologyMetadata.reportingStandard,
        gwpBasis: methodologyMetadata.gwpBasis,
        factorSourcePolicy: methodologyMetadata.factorSourcePolicy,
        overridePolicy: methodologyMetadata.overridePolicy,
        methodologyNotes: methodologyMetadata.methodologyNotes,
        boundarySummary: boundaryMetadata.boundarySummary,
        boundaryDepartments: JSON.stringify(boundaryMetadata.includedDepartments),
        boundaryExclusions: boundaryMetadata.exclusions,
        organizationalBoundaryMethod:
          boundaryMetadata.organizationalBoundaryMethod || null,
        organizationalBoundaryNotes: boundaryMetadata.organizationalBoundaryNotes || null,
        reportOwnerName: methodologyMetadata.reportOwnerName,
        reportOwnerEmail: methodologyMetadata.reportOwnerEmail,
        reportReviewerIds:
          reviewerSnapshot.reviewerIds.length > 0
            ? JSON.stringify(reviewerSnapshot.reviewerIds)
            : company?.defaultReportReviewerIds || null,
        reportRecipients:
          reviewerSnapshot.recipientEmails.length > 0
            ? reviewerSnapshot.recipientEmails.join(', ')
            : company?.defaultReportRecipients || null,
        approvalWorkflow: company?.defaultApprovalWorkflow || null,
        baseYear: methodologyMetadata.baseYear ?? null,
        baseYearNotes: methodologyMetadata.baseYearNotes || null,
        baseYearRecalculationPolicy:
          methodologyMetadata.baseYearRecalculationPolicy || null,
        scope2Method: methodologyMetadata.scope2Method || null,
        scope2LocationBasedEmissions:
          methodologyMetadata.scope2LocationBasedEmissions ?? null,
        scope2MarketBasedEmissions:
          methodologyMetadata.scope2MarketBasedEmissions ?? null,
        scope2DisclosureNotes: methodologyMetadata.scope2DisclosureNotes || null,
        scope2InstrumentNotes: methodologyMetadata.scope2InstrumentNotes || null,
        approvalStatus: 'pending_review',
        status: 'draft',
        companyId: companyId!,
      },
    });

    await createAuditLog(auth.session, {
      action: 'create',
      entityType: 'report',
      entityId: report.id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        reportType,
        reportMode: effectiveReportMode,
        reportingPeriod,
        approvalWorkflow: company?.defaultApprovalWorkflow || null,
        reportRecipients:
          reviewerSnapshot.recipientEmails.length > 0
            ? reviewerSnapshot.recipientEmails
            : company?.defaultReportRecipients || null,
      }),
    });

    return NextResponse.json({ report, reused: false }, { status: 201 });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

function generateSummary(
  reportType: string,
  reportMode: string,
  totalEmissions: number,
  previousEmissions: number,
  gaps: GapAnalysisGoalItem[],
  factorProvenanceSummary: string,
  reportAnalytics: ReportAnalyticsSummary,
  selectedDepartmentName?: string | null
): string {
  const modeProfile = getReportModeProfile(reportMode);
  const changeNarrative = buildEmissionsChangeNarrative(totalEmissions, previousEmissions);
  const gapNarrative = buildGapNarrative(gaps);
  const hotspotNarrative = buildHotspotNarrative(reportAnalytics, selectedDepartmentName);
  const qualityNarrative = buildQualityNarrative(reportAnalytics, factorProvenanceSummary);

  if (reportMode === 'board_summary') {
    return `${modeProfile.label}: ${formatCo2e(totalEmissions)} for ${reportType.replace(/_/g, ' ')} reporting. ${changeNarrative} ${hotspotNarrative} ${gapNarrative}`;
  }

  if (reportType === 'gap_analysis') {
    return `${modeProfile.label}: Total emissions for this period are ${formatCo2e(totalEmissions)}. ${changeNarrative} ${hotspotNarrative} ${gapNarrative} ${qualityNarrative}`;
  }

  return `${modeProfile.label}: This report covers emissions totaling ${formatCo2e(totalEmissions)}. ${changeNarrative} ${hotspotNarrative} ${qualityNarrative}`;
}

function generateOperationalInsights({
  reportType,
  reportMode,
  gaps,
  totalEmissions,
  previousEmissions,
  reportAnalytics,
  factorProvenance,
  selectedDepartmentName,
}: {
  reportType: string;
  reportMode: string;
  gaps: GapAnalysisGoalItem[];
  totalEmissions: number;
  previousEmissions: number;
  reportAnalytics: ReportAnalyticsSummary;
  factorProvenance: {
    overriddenEntries: number;
    unknownEntries: number;
    summaryText: string;
  };
  selectedDepartmentName?: string | null;
}): string {
  const insights: string[] = [];
  const leadingGap = getLeadingGap(gaps);
  const topSource = reportAnalytics.topEmissionSources[0];
  const topDepartment = reportAnalytics.topDepartments[0];
  const dominantScope = reportAnalytics.breakdownByScope[0];
  const trendNarrative = buildTrendNarrative(reportAnalytics.monthlyTrend);

  if (leadingGap) {
    insights.push(
      `Primary action: close ${leadingGap.goal} at ${leadingGap.department}. ${leadingGap.summary}`
    );
  }

  if (topSource) {
    insights.push(
      `${topSource.label} is the largest emissions driver in this report at ${formatCo2e(topSource.emissions)} (${topSource.percent.toFixed(1)}% of total emissions).`
    );
  }

  if (!selectedDepartmentName && topDepartment && topDepartment.departmentName !== 'Unassigned') {
    insights.push(
      `${topDepartment.departmentName} contributes ${topDepartment.percent.toFixed(1)}% of report emissions and should remain the main operating focus.`
    );
  } else if (selectedDepartmentName && dominantScope) {
    insights.push(
      `${dominantScope.label} is the leading emissions scope for ${selectedDepartmentName}, contributing ${dominantScope.percent.toFixed(1)}% of the facility total.`
    );
  }

  if (trendNarrative) {
    insights.push(trendNarrative);
  } else if (reportType !== 'gap_analysis') {
    insights.push(buildEmissionsChangeNarrative(totalEmissions, previousEmissions));
  }

  if (
    reportMode === 'verifier_ready' ||
    reportMode === 'annual_disclosure' ||
    reportAnalytics.quality.verificationRate < 90 ||
    reportAnalytics.quality.evidenceCoverageRate < 90 ||
    factorProvenance.unknownEntries > 0
  ) {
    insights.push(buildReadinessAction(reportAnalytics.quality, factorProvenance));
  }

  if (insights.length === 0) {
    insights.push(
      'Current emissions, data quality, and target performance do not indicate an urgent correction. Continue the current operating controls and keep the next report cycle under review.'
    );
  }

  return insights.slice(0, 4).join(' ');
}

function buildEmissionsChangeNarrative(totalEmissions: number, previousEmissions: number) {
  if (previousEmissions <= 0) {
    return 'No prior-period emissions baseline was available for comparison.';
  }

  const changePercent = ((previousEmissions - totalEmissions) / previousEmissions) * 100;
  if (Math.abs(changePercent) < 0.1) {
    return 'Emissions were effectively flat versus the previous period.';
  }

  return `Emissions ${changePercent >= 0 ? 'decreased' : 'increased'} by ${Math.abs(changePercent).toFixed(1)}% versus the previous period.`;
}

function buildGapNarrative(gaps: GapAnalysisGoalItem[]) {
  if (gaps.length === 0) {
    return 'No open goal gaps were identified in this reporting window.';
  }

  const atRiskCount = gaps.filter((gap) => gap.status === 'at_risk').length;
  const onTrackCount = gaps.filter((gap) => gap.status === 'on_track').length;
  const leadGap = [...gaps].sort((a, b) => {
    const aScore = (a.status === 'at_risk' ? 2 : 1) * 100 + (a.targetValue > 0 ? a.gapValue / Math.abs(a.targetValue) : a.gapValue);
    const bScore = (b.status === 'at_risk' ? 2 : 1) * 100 + (b.targetValue > 0 ? b.gapValue / Math.abs(b.targetValue) : b.gapValue);
    return bScore - aScore;
  })[0];

  const countParts: string[] = [];
  if (atRiskCount > 0) {
    countParts.push(`${atRiskCount} goal${atRiskCount === 1 ? '' : 's'} are at risk`);
  }
  if (onTrackCount > 0) {
    countParts.push(`${onTrackCount} open gap${onTrackCount === 1 ? '' : 's'} remain on track`);
  }
  const countNarrative = `${countParts.join(' and ')}.`;

  if (!leadGap) {
    return countNarrative;
  }

  const relationLabel = leadGap.relation === 'above_target' ? 'above target' : 'below target';
  return `${countNarrative} The largest open gap is ${leadGap.goal} at ${leadGap.department}, currently ${formatGapValue(leadGap.gapValue, leadGap.gapUnit)} ${relationLabel}.`;
}

function getLeadingGap(gaps: GapAnalysisGoalItem[]) {
  return [...gaps].sort((a, b) => {
    const aScore =
      (a.status === 'at_risk' ? 2 : 1) * 100 +
      (a.targetValue > 0 ? a.gapValue / Math.abs(a.targetValue) : a.gapValue);
    const bScore =
      (b.status === 'at_risk' ? 2 : 1) * 100 +
      (b.targetValue > 0 ? b.gapValue / Math.abs(b.targetValue) : b.gapValue);
    return bScore - aScore;
  })[0];
}

function buildHotspotNarrative(
  reportAnalytics: ReportAnalyticsSummary,
  selectedDepartmentName?: string | null
) {
  const topSource = reportAnalytics.topEmissionSources[0];
  const dominantScope = reportAnalytics.breakdownByScope[0];
  const topDepartment = reportAnalytics.topDepartments[0];

  if (selectedDepartmentName && dominantScope) {
    return `${dominantScope.label} is the largest scope in this facility report at ${dominantScope.percent.toFixed(1)}% of emissions.`;
  }

  if (topDepartment && topDepartment.departmentName !== 'Unassigned' && topSource) {
    return `${topDepartment.departmentName} leads this report footprint, while ${topSource.label.toLowerCase()} is the largest source category.`;
  }

  if (topSource) {
    return `${topSource.label} is the largest source category in this report.`;
  }

  if (dominantScope) {
    return `${dominantScope.label} carries the largest share of report emissions.`;
  }

  return 'No emissions hotspot was identified from the current report dataset.';
}

function buildQualityNarrative(
  reportAnalytics: ReportAnalyticsSummary,
  factorProvenanceSummary: string
) {
  const quality = reportAnalytics.quality;
  const qualityParts: string[] = [
    `${quality.verificationRate.toFixed(1)}% of entries are verified and ${quality.evidenceCoverageRate.toFixed(1)}% include source documentation.`,
  ];

  if (quality.unknownProvenanceEntries > 0) {
    qualityParts.push(
      `${quality.unknownProvenanceEntries} entries still need factor provenance review.`
    );
  } else {
    qualityParts.push(factorProvenanceSummary);
  }

  return qualityParts.join(' ');
}

function buildTrendNarrative(monthlyTrend: ReportAnalyticsSummary['monthlyTrend']) {
  if (monthlyTrend.length < 2) {
    return null;
  }

  const latest = monthlyTrend[monthlyTrend.length - 1];
  const previous = monthlyTrend[monthlyTrend.length - 2];
  if (previous.emissions <= 0) {
    return null;
  }

  const changePercent = ((latest.emissions - previous.emissions) / previous.emissions) * 100;
  if (Math.abs(changePercent) < 3) {
    return `Recent monthly activity stayed broadly stable from ${previous.label} to ${latest.label}.`;
  }

  return `Recent monthly activity ${changePercent > 0 ? 'rose' : 'fell'} by ${Math.abs(changePercent).toFixed(1)}% from ${previous.label} to ${latest.label}.`;
}

function buildReadinessAction(
  quality: ReportAnalyticsSummary['quality'],
  factorProvenance: { overriddenEntries: number; unknownEntries: number }
) {
  const actions: string[] = [];

  if (quality.verificationRate < 90) {
    actions.push('raise verification coverage');
  }

  if (quality.evidenceCoverageRate < 90) {
    actions.push('attach missing source evidence');
  }

  if (factorProvenance.unknownEntries > 0) {
    actions.push(`resolve ${factorProvenance.unknownEntries} entries with missing factor provenance`);
  }

  if (factorProvenance.overriddenEntries > 0) {
    actions.push(
      `review ${factorProvenance.overriddenEntries} override entr${factorProvenance.overriddenEntries === 1 ? 'y' : 'ies'}`
    );
  }

  if (actions.length === 0) {
    return 'Data readiness is strong enough to support the next review cycle without immediate evidence or provenance cleanup.';
  }

  return `Before the next approval step, ${actions.join(', ')}.`;
}
