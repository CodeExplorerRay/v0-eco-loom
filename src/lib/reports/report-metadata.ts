import type {
  OrganizationalBoundaryMethod,
  ReportBoundaryDepartment,
  ReportBoundaryMetadata,
  ReportMode,
  ReportMethodologyMetadata,
  Scope2Method,
} from '@/lib/types';
import { getReportModeMethodologyTemplate } from '@/lib/reports/report-modes';

type ReportMetadataEntry = {
  department?: {
    name?: string | null;
    code?: string | null;
    address?: string | null;
    country?: string | null;
  } | null;
};

export function buildReportMethodologyMetadata(input: {
  factorProvenanceSummary: string;
  reportOwnerName?: string;
  reportOwnerEmail?: string;
  reviewerNames?: string[];
  reportRecipients?: string;
  approvalWorkflow?: string;
  approvalStatus?: string;
  approvedByName?: string;
  approvedByEmail?: string;
  approvedAt?: string;
  reportingStandard?: string;
  gwpBasis?: string;
  factorSourcePolicy?: string;
  overridePolicy?: string;
  annualDisclosureNotes?: string;
  reportMode?: ReportMode;
  baseYear?: number;
  baseYearNotes?: string;
  baseYearRecalculationPolicy?: string;
  scope2Method?: Scope2Method;
  scope2LocationBasedEmissions?: number;
  scope2MarketBasedEmissions?: number;
  scope2DisclosureNotes?: string;
  scope2InstrumentNotes?: string;
}): ReportMethodologyMetadata {
  const baseMethodologyNotes =
    'This report is based on ledger entries recorded for the reporting period, calculated with the approved factor library or documented custom overrides, and summarized through Eco-Loom reporting analytics.';
  const lockedTemplate = getReportModeMethodologyTemplate(input.reportMode);
  const annualDisclosureAppendix =
    input.reportMode === 'annual_disclosure' && input.annualDisclosureNotes
      ? ` ${input.annualDisclosureNotes}`
      : '';
  const methodologyPrefix = lockedTemplate?.methodologyPrefix
    ? `${lockedTemplate.methodologyPrefix} `
    : '';

  return {
    reportingStandard:
      lockedTemplate?.reportingStandard ||
      input.reportingStandard ||
      'GHG Protocol Corporate Standard',
    gwpBasis:
      lockedTemplate?.gwpBasis ||
      input.gwpBasis ||
      'Mixed factor-library basis with published provenance carried per entry and disclosed in report outputs.',
    factorSourcePolicy:
      lockedTemplate?.factorSourcePolicy ||
      input.factorSourcePolicy ||
      input.factorProvenanceSummary,
    overridePolicy:
      lockedTemplate?.overridePolicy ||
      input.overridePolicy ||
      'Custom factor overrides are restricted to admins and require a documented reason, actor, and timestamp.',
    methodologyNotes: `${methodologyPrefix}${baseMethodologyNotes}${annualDisclosureAppendix}`,
    reportOwnerName: input.reportOwnerName,
    reportOwnerEmail: input.reportOwnerEmail,
    reviewerNames: input.reviewerNames || [],
    reportRecipients: parseRecipients(input.reportRecipients),
    approvalWorkflow: input.approvalWorkflow,
    approvalStatus: input.approvalStatus,
    approvedByName: input.approvedByName,
    approvedByEmail: input.approvedByEmail,
    approvedAt: input.approvedAt,
    baseYear: input.baseYear,
    baseYearNotes: input.baseYearNotes,
    baseYearRecalculationPolicy: input.baseYearRecalculationPolicy,
    scope2Method: input.scope2Method,
    scope2LocationBasedEmissions: input.scope2LocationBasedEmissions,
    scope2MarketBasedEmissions: input.scope2MarketBasedEmissions,
    scope2DisclosureNotes: input.scope2DisclosureNotes,
    scope2InstrumentNotes: input.scope2InstrumentNotes,
  };
}

export function buildReportBoundaryMetadata(
  entries: ReportMetadataEntry[],
  reportingPeriod: string,
  options?: {
    boundarySummary?: string;
    exclusions?: string;
    organizationalBoundaryMethod?: OrganizationalBoundaryMethod;
    organizationalBoundaryNotes?: string;
  }
): ReportBoundaryMetadata {
  const departments = dedupeDepartments(
    entries.reduce<ReportBoundaryDepartment[]>((collected, entry) => {
      if (entry.department?.name) {
        collected.push({
          name: entry.department.name,
          code: entry.department.code || null,
          address: entry.department.address || null,
          country: entry.department.country || null,
        });
      }

      return collected;
    }, [])
  );

  const departmentLabel =
    departments.length > 0
      ? departments.length === 1
        ? '1 facility/site with recorded activity'
        : `${departments.length} facilities/sites with recorded activity`
      : 'company-wide reporting activity';

  return {
    boundarySummary:
      options?.boundarySummary ||
      `This report covers ${departmentLabel} for ${reportingPeriod}, based on ledger entries recorded inside the Eco-Loom workspace for the selected reporting period.${options?.organizationalBoundaryMethod ? ` Organizational boundary method: ${formatBoundaryMethodLabel(options.organizationalBoundaryMethod)}.` : ''}`,
    includedDepartments: departments,
    exclusions:
      options?.exclusions ||
      'This report excludes emissions that were not recorded in the ledger for the reporting period and does not separately model market-based contractual instruments unless represented in the underlying ledger evidence.',
    organizationalBoundaryMethod: options?.organizationalBoundaryMethod,
    organizationalBoundaryNotes: options?.organizationalBoundaryNotes,
  };
}

function dedupeDepartments(departments: ReportBoundaryDepartment[]) {
  const seen = new Map<string, ReportBoundaryDepartment>();

  for (const department of departments) {
    const key = `${department.code || 'none'}::${department.name}`;
    if (!seen.has(key)) {
      seen.set(key, department);
    }
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function parseRecipients(recipients?: string) {
  if (!recipients) {
    return [];
  }

  return recipients
    .split(/[,\n;]/)
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

function formatBoundaryMethodLabel(method: OrganizationalBoundaryMethod) {
  switch (method) {
    case 'operational_control':
      return 'Operational control';
    case 'financial_control':
      return 'Financial control';
    case 'equity_share':
      return 'Equity share';
    default:
      return method;
  }
}
