import { db } from '@/lib/db';
import { buildTransactionDateRange } from '@/lib/reports/reporting-period';
import type {
  OrganizationalBoundaryMethod,
  Report,
  ReportAnalyticsSummary,
  ReportAppendixPackage,
  ReportBoundaryMetadata,
  ReportFactorProvenanceSummary,
  ReportMethodologyMetadata,
  ReportMode,
  Scope2Method,
  ReportVerifierManifest,
} from '@/lib/types';

type ReportWithDates = {
  id: string;
  title: string;
  reportType: string;
  reportMode: string | null;
  reportingPeriod: string;
  summary: string;
  totalEmissions: number | null;
  previousPeriodEmissions: number | null;
  gapsIdentified: string | null;
  recommendations: string | null;
  status: string;
  reportingStandard: string | null;
  gwpBasis: string | null;
  factorSourcePolicy: string | null;
  overridePolicy: string | null;
  methodologyNotes: string | null;
  boundarySummary: string | null;
  boundaryDepartments: string | null;
  boundaryExclusions: string | null;
  organizationalBoundaryMethod: string | null;
  organizationalBoundaryNotes: string | null;
  reportOwnerName: string | null;
  reportOwnerEmail: string | null;
  reportReviewerIds: string | null;
  reportRecipients: string | null;
  approvalWorkflow: string | null;
  baseYear: number | null;
  baseYearNotes: string | null;
  baseYearRecalculationPolicy: string | null;
  scope2Method: string | null;
  scope2LocationBasedEmissions: number | null;
  scope2MarketBasedEmissions: number | null;
  scope2DisclosureNotes: string | null;
  scope2InstrumentNotes: string | null;
  approvalStatus: string | null;
  approvedByName: string | null;
  approvedByEmail: string | null;
  approvedAt: Date | null;
  companyId: string;
  notionPageId: string | null;
  notionSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
};

export async function getReportLedgerEvidence(
  companyId: string,
  reportingPeriod: string,
  departmentId?: string | null
) {
  return db.carbonLedgerEntry.findMany({
    where: {
      companyId,
      transactionDate: buildTransactionDateRange(reportingPeriod),
      ...(departmentId ? { departmentId } : {}),
    },
    include: {
      department: true,
    },
    orderBy: {
      transactionDate: 'asc',
    },
  });
}

export function toSerializableReport(
  report: ReportWithDates,
  factorProvenance: ReportFactorProvenanceSummary,
  reportAnalytics?: ReportAnalyticsSummary,
  appendices?: ReportAppendixPackage,
  verifierManifest?: ReportVerifierManifest,
  overrides?: {
    methodologyMetadata?: ReportMethodologyMetadata;
    boundaryMetadata?: ReportBoundaryMetadata;
  }
): Report {
  const normalizedScope2Method = normalizeScope2Method(report.scope2Method);
  const normalizedBoundaryMethod = normalizeBoundaryMethod(
    report.organizationalBoundaryMethod
  );
  const methodologyMetadata: ReportMethodologyMetadata | undefined =
    overrides?.methodologyMetadata ??
    (report.reportingStandard ||
    report.gwpBasis ||
    report.factorSourcePolicy ||
    report.overridePolicy ||
    report.methodologyNotes ||
    report.baseYear !== null ||
    report.baseYearNotes ||
    report.baseYearRecalculationPolicy ||
    report.scope2Method ||
    report.scope2LocationBasedEmissions !== null ||
    report.scope2MarketBasedEmissions !== null ||
    report.scope2DisclosureNotes ||
    report.scope2InstrumentNotes
      ? {
          reportingStandard: report.reportingStandard || 'GHG Protocol Corporate Standard',
          gwpBasis:
            report.gwpBasis ||
            'Mixed factor-library basis with published provenance carried per entry and disclosed in report outputs.',
          factorSourcePolicy: report.factorSourcePolicy || factorProvenance.summaryText,
          overridePolicy:
            report.overridePolicy ||
            'Custom factor overrides are restricted to admins and require a documented reason, actor, and timestamp.',
          methodologyNotes:
            report.methodologyNotes ||
            'This report is based on ledger entries recorded for the reporting period and summarized through Eco-Loom reporting analytics.',
          reportOwnerName: report.reportOwnerName || undefined,
          reportOwnerEmail: report.reportOwnerEmail || undefined,
          reviewerNames: parseRecipients(report.reportRecipients),
          reportRecipients: parseRecipients(report.reportRecipients),
          approvalWorkflow: report.approvalWorkflow || undefined,
          approvalStatus: report.approvalStatus || undefined,
          approvedByName: report.approvedByName || undefined,
          approvedByEmail: report.approvedByEmail || undefined,
          approvedAt: report.approvedAt?.toISOString() || undefined,
          baseYear: report.baseYear ?? undefined,
          baseYearNotes: report.baseYearNotes || undefined,
          baseYearRecalculationPolicy: report.baseYearRecalculationPolicy || undefined,
          scope2Method: normalizedScope2Method,
          scope2LocationBasedEmissions: report.scope2LocationBasedEmissions ?? undefined,
          scope2MarketBasedEmissions: report.scope2MarketBasedEmissions ?? undefined,
          scope2DisclosureNotes: report.scope2DisclosureNotes || undefined,
          scope2InstrumentNotes: report.scope2InstrumentNotes || undefined,
        }
      : undefined);

  const boundaryMetadata: ReportBoundaryMetadata | undefined =
    overrides?.boundaryMetadata ??
    (report.boundarySummary ||
    report.boundaryDepartments ||
    report.boundaryExclusions ||
    report.organizationalBoundaryMethod ||
    report.organizationalBoundaryNotes
      ? {
          boundarySummary:
            report.boundarySummary ||
            `This report covers ledger entries recorded for ${report.reportingPeriod} inside the Eco-Loom workspace.`,
          includedDepartments: parseBoundaryDepartments(report.boundaryDepartments),
          exclusions:
            report.boundaryExclusions ||
            'Emissions not recorded in the ledger for the reporting period are excluded from this report.',
          organizationalBoundaryMethod: normalizedBoundaryMethod,
          organizationalBoundaryNotes: report.organizationalBoundaryNotes || undefined,
        }
      : undefined);

  return {
    id: report.id,
    title: report.title,
    reportType: report.reportType as Report['reportType'],
    reportMode: (report.reportMode as ReportMode | null) || 'internal_management',
    reportingPeriod: report.reportingPeriod,
    summary: report.summary,
    totalEmissions:
      typeof report.totalEmissions === 'number' ? report.totalEmissions : Number(report.totalEmissions || 0),
    previousPeriodEmissions:
      report.previousPeriodEmissions !== null && report.previousPeriodEmissions !== undefined
        ? typeof report.previousPeriodEmissions === 'number'
          ? report.previousPeriodEmissions
          : Number(report.previousPeriodEmissions)
        : undefined,
    gapsIdentified: report.gapsIdentified || undefined,
    recommendations: report.recommendations || undefined,
    status: report.status as Report['status'],
    companyId: report.companyId,
    notionPageId: report.notionPageId || undefined,
    notionSyncedAt: report.notionSyncedAt?.toISOString() || undefined,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    publishedAt: report.publishedAt?.toISOString() || undefined,
    reportReviewerIds: report.reportReviewerIds || undefined,
    reportRecipients: report.reportRecipients || undefined,
    approvalWorkflow: report.approvalWorkflow || undefined,
    approvalStatus: report.approvalStatus || undefined,
    approvedByName: report.approvedByName || undefined,
    approvedByEmail: report.approvedByEmail || undefined,
    approvedAt: report.approvedAt?.toISOString() || undefined,
    organizationalBoundaryMethod:
      boundaryMetadata?.organizationalBoundaryMethod ??
      normalizedBoundaryMethod ??
      undefined,
    organizationalBoundaryNotes:
      boundaryMetadata?.organizationalBoundaryNotes || report.organizationalBoundaryNotes || undefined,
    baseYear: methodologyMetadata?.baseYear ?? report.baseYear ?? undefined,
    baseYearNotes: methodologyMetadata?.baseYearNotes || report.baseYearNotes || undefined,
    baseYearRecalculationPolicy:
      methodologyMetadata?.baseYearRecalculationPolicy ||
      report.baseYearRecalculationPolicy ||
      undefined,
    scope2Method: methodologyMetadata?.scope2Method ?? normalizedScope2Method ?? undefined,
    scope2LocationBasedEmissions:
      methodologyMetadata?.scope2LocationBasedEmissions ??
      report.scope2LocationBasedEmissions ??
      undefined,
    scope2MarketBasedEmissions:
      methodologyMetadata?.scope2MarketBasedEmissions ??
      report.scope2MarketBasedEmissions ??
      undefined,
    scope2DisclosureNotes:
      methodologyMetadata?.scope2DisclosureNotes || report.scope2DisclosureNotes || undefined,
    scope2InstrumentNotes:
      methodologyMetadata?.scope2InstrumentNotes || report.scope2InstrumentNotes || undefined,
    methodologyMetadata,
    boundaryMetadata,
    factorProvenance,
    reportAnalytics,
    appendices,
    verifierManifest,
  };
}

export function buildVerifierExportPackage(
  report: Report,
  factorProvenance: ReportFactorProvenanceSummary,
  reportAnalytics: ReportAnalyticsSummary | undefined,
  appendices: ReportAppendixPackage,
  verifierManifest: ReportVerifierManifest,
  entries: Awaited<ReturnType<typeof getReportLedgerEvidence>>
) {
  return {
    report,
    verifierManifest,
    factorProvenance,
    reportAnalytics: reportAnalytics || null,
    appendices,
    generatedAt: new Date().toISOString(),
    ledgerEvidence: entries.map((entry) => ({
      entryId: entry.id,
      transactionDate: entry.transactionDate.toISOString(),
      reportingPeriod: entry.reportingPeriod,
      sourceType: entry.sourceType,
      category: entry.category,
      activityValue: entry.activityValue,
      activityUnit: entry.activityUnit,
      emissionFactor: entry.emissionFactor,
      emissionFactorUnit: entry.emissionFactorUnit,
      co2Equivalent: entry.co2Equivalent,
      co2Unit: entry.co2Unit,
      departmentName: entry.department?.name || null,
      departmentCode: entry.department?.code || null,
      sourceDocument: entry.sourceDocument || null,
      verified: entry.verified,
      verifiedBy: entry.verifiedBy || null,
      verifiedAt: entry.verifiedAt?.toISOString() || null,
      factorSource: entry.factorSource || null,
      factorSourceFamily: entry.factorSourceFamily || null,
      factorYear: entry.factorYear ?? null,
      factorRegion: entry.factorRegion || null,
      factorMethodology: entry.factorMethodology || null,
      factorGwpBasis: entry.factorGwpBasis || null,
      factorDescription: entry.factorDescription || null,
      factorOverridden: entry.factorOverridden,
      factorOverrideReason: entry.factorOverrideReason || null,
      factorOverrideBy: entry.factorOverrideByName || null,
      factorOverrideAt: entry.factorOverrideAt?.toISOString() || null,
      notionPageId: entry.notionPageId || null,
      notionSyncedAt: entry.notionSyncedAt?.toISOString() || null,
    })),
  };
}

export function buildVerifierCsv(
  report: Report,
  factorProvenance: ReportFactorProvenanceSummary,
  reportAnalytics: ReportAnalyticsSummary | undefined,
  appendices: ReportAppendixPackage,
  verifierManifest: ReportVerifierManifest,
  entries: Awaited<ReturnType<typeof getReportLedgerEvidence>>
) {
  const evidenceHeaders = [
    'Report ID',
    'Report Title',
    'Report Type',
    'Report Mode',
    'Reporting Period',
    'Report Status',
    'Report Total Emissions',
    'Report Summary',
    'Provenance Summary',
    'Total Entries',
    'Verification Rate',
    'Evidence Coverage Rate',
    'Entry ID',
    'Transaction Date',
    'Source Type',
    'Category',
    'Activity Value',
    'Activity Unit',
    'Emission Factor',
    'Emission Factor Unit',
    'CO2 Equivalent',
    'Facility Name',
    'Facility Code',
    'Source Document',
    'Verified',
    'Verified By',
    'Verified At',
    'Factor Source',
    'Factor Family',
    'Factor Year',
    'Factor Region',
    'Factor Methodology',
    'Factor GWP Basis',
    'Factor Description',
    'Factor Overridden',
    'Override Reason',
    'Override By',
    'Override At',
    'Notion Page ID',
    'Notion Synced At',
  ];

  const evidenceRows = entries.map((entry) => [
    report.id,
    report.title,
    report.reportType,
    report.reportMode || '',
    report.reportingPeriod,
    report.status,
    report.totalEmissions,
    report.summary,
    factorProvenance.summaryText,
    reportAnalytics?.quality.totalEntries ?? '',
    reportAnalytics?.quality.verificationRate ?? '',
    reportAnalytics?.quality.evidenceCoverageRate ?? '',
    entry.id,
    entry.transactionDate.toISOString(),
    entry.sourceType,
    entry.category,
    entry.activityValue,
    entry.activityUnit,
    entry.emissionFactor,
    entry.emissionFactorUnit,
    entry.co2Equivalent,
    entry.department?.name || '',
    entry.department?.code || '',
    entry.sourceDocument || '',
    entry.verified ? 'Yes' : 'No',
    entry.verifiedBy || '',
    entry.verifiedAt?.toISOString() || '',
    entry.factorSource || '',
    entry.factorSourceFamily || '',
    entry.factorYear ?? '',
    entry.factorRegion || '',
    entry.factorMethodology || '',
    entry.factorGwpBasis || '',
    entry.factorDescription || '',
    entry.factorOverridden ? 'Yes' : 'No',
    entry.factorOverrideReason || '',
    entry.factorOverrideByName || '',
    entry.factorOverrideAt?.toISOString() || '',
    entry.notionPageId || '',
    entry.notionSyncedAt?.toISOString() || '',
  ]);

  const manifestRows = [
    ['Manifest Field', 'Value'],
    ['Exported At', verifierManifest.exportedAt],
    ['Report ID', verifierManifest.reportId],
    ['Report Title', verifierManifest.reportTitle],
    ['Report Mode', verifierManifest.reportMode],
    ['Reporting Period', verifierManifest.reportingPeriod],
    ['Evidence Row Count', verifierManifest.evidenceRowCount],
    ['Factor Register Count', verifierManifest.factorRegisterCount],
    ['Override Count', verifierManifest.overrideCount],
    ['Unresolved Issue Count', verifierManifest.unresolvedIssueCount],
    ['Checksum', verifierManifest.checksum],
  ];

  const issueRows = [
    ['Issue ID', 'Severity', 'Title', 'Description', 'Count'],
    ...appendices.unresolvedQualityIssues.map((issue) => [
      issue.id,
      issue.severity,
      issue.title,
      issue.description,
      issue.count,
    ]),
  ];

  const factorRows = [
    ['Factor Key', 'Source Label', 'Family', 'Year', 'Region', 'Methodology', 'GWP Basis', 'Factor Unit', 'Entries', 'Emissions'],
    ...appendices.factorRegister.map((item) => [
      item.key,
      item.sourceLabel,
      item.sourceFamily || '',
      item.year ?? '',
      item.region || '',
      item.methodology || '',
      item.gwpBasis || '',
      item.factorUnit,
      item.entries,
      item.emissions,
    ]),
  ];

  const overrideRows = [
    ['Entry ID', 'Transaction Date', 'Facility / Site', 'Factor Value', 'Factor Unit', 'Override Reason', 'Override By', 'Override At'],
    ...appendices.overrideRegister.map((item) => [
      item.entryId,
      item.transactionDate,
      item.departmentName || '',
      item.factorValue,
      item.factorUnit,
      item.overrideReason,
      item.overrideBy || '',
      item.overrideAt || '',
    ]),
  ];

  return [
    ['Verifier Manifest'],
    ...manifestRows,
    [],
    ['Unresolved Quality Issues'],
    ...issueRows,
    [],
    ['Factor Register'],
    ...factorRows,
    [],
    ['Override Register'],
    ...overrideRows,
    [],
    ['Evidence Register'],
    evidenceHeaders,
    ...evidenceRows,
  ]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');
}

function escapeCsvValue(value: unknown) {
  const stringValue = String(value ?? '');
  const escaped = stringValue.replace(/"/g, '""');
  return /[",\n]/.test(stringValue) ? `"${escaped}"` : escaped;
}

function parseBoundaryDepartments(boundaryDepartments: string | null) {
  if (!boundaryDepartments) {
    return [];
  }

  try {
    const parsed = JSON.parse(boundaryDepartments) as Array<{
      name?: string;
      code?: string | null;
      address?: string | null;
      country?: string | null;
    }>;
    return parsed
      .filter((department) => typeof department?.name === 'string' && department.name.trim().length > 0)
      .map((department) => ({
        name: department.name!.trim(),
        code: department.code || null,
        address: department.address || null,
        country: department.country || null,
      }));
  } catch {
    return [];
  }
}

function parseRecipients(reportRecipients: string | null) {
  if (!reportRecipients) {
    return [];
  }

  return reportRecipients
    .split(/[,\n;]/)
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

function normalizeBoundaryMethod(
  value: string | null
): OrganizationalBoundaryMethod | undefined {
  switch (value) {
    case 'operational_control':
    case 'financial_control':
    case 'equity_share':
      return value;
    default:
      return undefined;
  }
}

function normalizeScope2Method(value: string | null): Scope2Method | undefined {
  switch (value) {
    case 'location_based':
    case 'market_based':
    case 'dual_reporting':
      return value;
    default:
      return undefined;
  }
}
