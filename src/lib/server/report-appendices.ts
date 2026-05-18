import { createHash } from 'crypto';
import type {
  Report,
  ReportAnalyticsSummary,
  ReportAppendixPackage,
  ReportEvidenceRegisterItem,
  ReportFactorProvenanceSummary,
  ReportOverrideRegisterItem,
  ReportVerifierManifest,
} from '@/lib/types';
import type { getReportLedgerEvidence } from '@/lib/server/report-exports';

type LedgerEvidenceEntry = Awaited<ReturnType<typeof getReportLedgerEvidence>>[number];
type ReportAppendixContext = {
  reportMode?: string | null;
  reportingPeriod: string;
  reportOwnerName?: string | null;
  reportOwnerEmail?: string | null;
  reportingStandard?: string | null;
  gwpBasis?: string | null;
  boundarySummary?: string | null;
  boundaryExclusions?: string | null;
  approvalWorkflow?: string | null;
  scope2Method?: string | null;
  scope2LocationBasedEmissions?: number | null;
  scope2MarketBasedEmissions?: number | null;
};

export function buildReportAppendices(
  report: ReportAppendixContext,
  entries: LedgerEvidenceEntry[],
  factorProvenance: ReportFactorProvenanceSummary,
  reportAnalytics?: ReportAnalyticsSummary
): ReportAppendixPackage {
  const evidenceRegister = entries.map<ReportEvidenceRegisterItem>((entry) => ({
    entryId: entry.id,
    transactionDate: entry.transactionDate.toISOString(),
    sourceType: entry.sourceType as ReportEvidenceRegisterItem['sourceType'],
    category: entry.category as ReportEvidenceRegisterItem['category'],
    departmentName: entry.department?.name || null,
    sourceDocument: entry.sourceDocument || null,
    verified: entry.verified,
    verifiedAt: entry.verifiedAt?.toISOString() || null,
  }));

  const factorRegisterMap = new Map<
    string,
    {
      key: string;
      sourceLabel: string;
      sourceFamily?: string | null;
      year?: number | null;
      region?: string | null;
      methodology?: string | null;
      gwpBasis?: string | null;
      factorUnit: string;
      entries: number;
      emissions: number;
    }
  >();

  for (const entry of entries) {
    const sourceLabel = entry.factorSource || 'Unknown factor source';
    const key = [
      sourceLabel,
      entry.factorSourceFamily || 'unknown',
      entry.factorYear ?? 'na',
      entry.factorRegion || 'global',
      entry.factorMethodology || 'unspecified',
      entry.emissionFactorUnit,
    ].join('::');

    const current = factorRegisterMap.get(key) || {
      key,
      sourceLabel,
      sourceFamily: entry.factorSourceFamily || null,
      year: entry.factorYear ?? null,
      region: entry.factorRegion || null,
      methodology: entry.factorMethodology || null,
      gwpBasis: entry.factorGwpBasis || null,
      factorUnit: entry.emissionFactorUnit,
      entries: 0,
      emissions: 0,
    };

    current.entries += 1;
    current.emissions += entry.co2Equivalent;
    factorRegisterMap.set(key, current);
  }

  const factorRegister = [...factorRegisterMap.values()].sort((a, b) => b.emissions - a.emissions);

  const overrideRegister = entries
    .filter((entry) => entry.factorOverridden)
    .map<ReportOverrideRegisterItem>((entry) => ({
      entryId: entry.id,
      transactionDate: entry.transactionDate.toISOString(),
      departmentName: entry.department?.name || null,
      factorValue: entry.emissionFactor,
      factorUnit: entry.emissionFactorUnit,
      overrideReason: entry.factorOverrideReason || 'Reason not recorded',
      overrideBy: entry.factorOverrideByName || null,
      overrideAt: entry.factorOverrideAt?.toISOString() || null,
    }))
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  const unresolvedQualityIssues = buildQualityIssues(
    report,
    entries,
    factorProvenance,
    reportAnalytics
  );

  return {
    evidenceRegister,
    factorRegister,
    overrideRegister,
    unresolvedQualityIssues,
  };
}

export function buildReportVerifierManifest(
  report: Report,
  appendices: ReportAppendixPackage
): ReportVerifierManifest {
  const exportedAt = new Date().toISOString();
  const manifestSeed = {
    reportId: report.id,
    reportingPeriod: report.reportingPeriod,
    evidenceIds: appendices.evidenceRegister.map((item) => item.entryId).sort(),
    factorKeys: appendices.factorRegister.map((item) => item.key).sort(),
    overrideIds: appendices.overrideRegister.map((item) => item.entryId).sort(),
    issueIds: appendices.unresolvedQualityIssues.map((item) => item.id).sort(),
  };

  const checksum = createHash('sha256')
    .update(JSON.stringify(manifestSeed))
    .digest('hex');

  return {
    exportedAt,
    reportId: report.id,
    reportTitle: report.title,
    reportMode: report.reportMode || 'internal_management',
    reportingPeriod: report.reportingPeriod,
    evidenceRowCount: appendices.evidenceRegister.length,
    factorRegisterCount: appendices.factorRegister.length,
    overrideCount: appendices.overrideRegister.length,
    unresolvedIssueCount: appendices.unresolvedQualityIssues.length,
    checksum,
  };
}

function buildQualityIssues(
  report: ReportAppendixContext,
  entries: LedgerEvidenceEntry[],
  factorProvenance: ReportFactorProvenanceSummary,
  reportAnalytics?: ReportAnalyticsSummary
) {
  const issues: ReportAppendixPackage['unresolvedQualityIssues'] = [];
  const isExternalMode =
    report.reportMode === 'verifier_ready' || report.reportMode === 'annual_disclosure';
  const unverifiedCount =
    reportAnalytics?.quality.unverifiedEntries ?? entries.filter((entry) => !entry.verified).length;
  const missingEvidenceCount =
    (reportAnalytics?.quality.totalEntries ?? entries.length) -
    (reportAnalytics?.quality.entriesWithSourceDocument ??
      entries.filter((entry) => Boolean(entry.sourceDocument)).length);

  if (unverifiedCount > 0) {
    issues.push({
      id: 'unverified_entries',
      severity: 'medium',
      title: 'Unverified ledger entries',
      description: `${unverifiedCount} ledger entries remain unverified for the reporting period.`,
      count: unverifiedCount,
    });
  }

  if (missingEvidenceCount > 0) {
    issues.push({
      id: 'missing_source_documents',
      severity: 'medium',
      title: 'Missing source documentation',
      description: `${missingEvidenceCount} entries do not have linked source documents in the evidence register.`,
      count: missingEvidenceCount,
    });
  }

  if (factorProvenance.unknownEntries > 0) {
    issues.push({
      id: 'unknown_factor_provenance',
      severity: 'high',
      title: 'Unknown factor provenance',
      description: `${factorProvenance.unknownEntries} entries are missing a known factor source and should be resolved before external assurance.`,
      count: factorProvenance.unknownEntries,
    });
  }

  if (factorProvenance.overriddenEntries > 0) {
    issues.push({
      id: 'custom_factor_overrides',
      severity: 'low',
      title: 'Custom factor overrides require review',
      description: `${factorProvenance.overriddenEntries} entries use admin overrides and should be cross-checked with supporting rationale.`,
      count: factorProvenance.overriddenEntries,
    });
  }

  if (entries.length === 0) {
    issues.push({
      id: 'no_evidence',
      severity: 'high',
      title: 'No ledger evidence in reporting window',
      description: `No ledger entries were found inside the ${report.reportingPeriod} reporting window, so the report cannot substantiate any emissions totals.`,
      count: 0,
    });
  }

  if (isExternalMode && (!report.reportOwnerName || !report.reportOwnerEmail)) {
    issues.push({
      id: 'missing_report_owner',
      severity: 'medium',
      title: 'Report owner details are incomplete',
      description:
        'Verifier-ready and annual disclosure outputs require a named report owner and contact email before publication.',
      count: 1,
    });
  }

  if (isExternalMode && !report.approvalWorkflow) {
    issues.push({
      id: 'missing_approval_workflow',
      severity: 'medium',
      title: 'Approval workflow is missing',
      description:
        'External-facing report modes require a documented approval workflow before publication.',
      count: 1,
    });
  }

  if (isExternalMode && (!report.reportingStandard || !report.gwpBasis)) {
    issues.push({
      id: 'missing_methodology_metadata',
      severity: 'high',
      title: 'Methodology metadata is incomplete',
      description:
        'Reporting standard and GWP basis must both be set before verifier-ready or annual disclosure reports can be published.',
      count: 1,
    });
  }

  if (isExternalMode && (!report.boundarySummary || !report.boundaryExclusions)) {
    issues.push({
      id: 'missing_boundary_metadata',
      severity: 'high',
      title: 'Boundary disclosure is incomplete',
      description:
        'Boundary summary and exclusions must both be captured before verifier-ready or annual disclosure reports can be published.',
      count: 1,
    });
  }

  if (report.reportMode === 'annual_disclosure' && !/^\d{4}$/.test(report.reportingPeriod)) {
    issues.push({
      id: 'annual_disclosure_period_mismatch',
      severity: 'high',
      title: 'Annual disclosure mode requires an annual reporting period',
      description:
        'Annual disclosure reports can only be published for whole-year reporting periods such as 2026.',
      count: 1,
    });
  }

  const scope2Entries = entries.filter((entry) => entry.category === 'Scope 2');
  if (isExternalMode && scope2Entries.length > 0 && !report.scope2Method) {
    issues.push({
      id: 'missing_scope2_method',
      severity: 'high',
      title: 'Scope 2 methodology is missing',
      description:
        'External-facing reports with Scope 2 activity must declare whether Scope 2 is being disclosed on a location-based, market-based, or dual-reporting basis.',
      count: 1,
    });
  }

  if (
    isExternalMode &&
    scope2Entries.length > 0 &&
    (report.scope2Method === 'market_based' || report.scope2Method === 'dual_reporting') &&
    report.scope2MarketBasedEmissions == null
  ) {
    issues.push({
      id: 'missing_scope2_market_total',
      severity: 'high',
      title: 'Scope 2 market-based total is missing',
      description:
        'The selected Scope 2 disclosure method requires a market-based emissions total before the report can be published.',
      count: 1,
    });
  }

  return issues;
}
