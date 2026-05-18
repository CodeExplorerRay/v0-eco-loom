import {
  buildReportBoundaryMetadata,
  buildReportMethodologyMetadata,
} from '@/lib/reports/report-metadata';
import type {
  OrganizationalBoundaryMethod,
  ReportBoundaryMetadata,
  ReportMethodologyMetadata,
  ReportMode,
  Scope2Method,
} from '@/lib/types';

type DisclosureDepartmentEntry = {
  category?: string | null;
  department?: {
    name?: string | null;
    code?: string | null;
    address?: string | null;
    country?: string | null;
  } | null;
  co2Equivalent: number;
};

type CompanyDisclosureDefaults = {
  defaultReportingStandard?: string | null;
  defaultGwpBasis?: string | null;
  defaultFactorSourcePolicy?: string | null;
  defaultOverridePolicy?: string | null;
  defaultReportOwnerName?: string | null;
  defaultReportOwnerEmail?: string | null;
  defaultReportRecipients?: string | null;
  defaultApprovalWorkflow?: string | null;
  defaultOrganizationalBoundaryMethod?: OrganizationalBoundaryMethod | string | null;
  defaultOrganizationalBoundaryNotes?: string | null;
  defaultBaseYear?: number | null;
  defaultBaseYearNotes?: string | null;
  defaultBaseYearRecalculationPolicy?: string | null;
  defaultScope2Method?: Scope2Method | string | null;
  defaultScope2MarketBasedEmissions?: number | null;
  defaultScope2DisclosureNotes?: string | null;
  defaultScope2InstrumentNotes?: string | null;
  annualDisclosureNotes?: string | null;
};

type ReportDisclosureSnapshot = {
  reportMode?: ReportMode | string | null;
  reportingPeriod: string;
  reportingStandard?: string | null;
  gwpBasis?: string | null;
  factorSourcePolicy?: string | null;
  overridePolicy?: string | null;
  methodologyNotes?: string | null;
  boundarySummary?: string | null;
  boundaryExclusions?: string | null;
  organizationalBoundaryMethod?: OrganizationalBoundaryMethod | string | null;
  organizationalBoundaryNotes?: string | null;
  reportOwnerName?: string | null;
  reportOwnerEmail?: string | null;
  reportRecipients?: string | null;
  approvalWorkflow?: string | null;
  approvalStatus?: string | null;
  approvedByName?: string | null;
  approvedByEmail?: string | null;
  approvedAt?: Date | string | null;
  baseYear?: number | null;
  baseYearNotes?: string | null;
  baseYearRecalculationPolicy?: string | null;
  scope2Method?: Scope2Method | string | null;
  scope2LocationBasedEmissions?: number | null;
  scope2MarketBasedEmissions?: number | null;
  scope2DisclosureNotes?: string | null;
  scope2InstrumentNotes?: string | null;
};

type EffectiveDisclosureInput = {
  report: ReportDisclosureSnapshot;
  company?: CompanyDisclosureDefaults | null;
  entries: DisclosureDepartmentEntry[];
  factorProvenanceSummary: string;
  reviewerNames?: string[];
};

export function buildEffectiveReportDisclosure(input: EffectiveDisclosureInput) {
  const scope2LocationBasedEmissions =
    input.report.scope2LocationBasedEmissions ??
    sumScope2LocationBasedEmissions(input.entries);
  const scope2Method = normalizeScope2Method(
    input.report.scope2Method || input.company?.defaultScope2Method
  );
  const organizationalBoundaryMethod = normalizeBoundaryMethod(
    input.report.organizationalBoundaryMethod ||
      input.company?.defaultOrganizationalBoundaryMethod
  );
  const methodologyMetadata = buildReportMethodologyMetadata({
    factorProvenanceSummary: input.factorProvenanceSummary,
    reportOwnerName:
      input.report.reportOwnerName || input.company?.defaultReportOwnerName || undefined,
    reportOwnerEmail:
      input.report.reportOwnerEmail || input.company?.defaultReportOwnerEmail || undefined,
    reviewerNames: input.reviewerNames,
    reportRecipients:
      input.report.reportRecipients || input.company?.defaultReportRecipients || undefined,
    approvalWorkflow:
      input.report.approvalWorkflow || input.company?.defaultApprovalWorkflow || undefined,
    approvalStatus: input.report.approvalStatus || undefined,
    approvedByName: input.report.approvedByName || undefined,
    approvedByEmail: input.report.approvedByEmail || undefined,
    approvedAt: normalizeApprovedAt(input.report.approvedAt),
    reportingStandard:
      input.report.reportingStandard || input.company?.defaultReportingStandard || undefined,
    gwpBasis: input.report.gwpBasis || input.company?.defaultGwpBasis || undefined,
    factorSourcePolicy:
      input.report.factorSourcePolicy || input.company?.defaultFactorSourcePolicy || undefined,
    overridePolicy:
      input.report.overridePolicy || input.company?.defaultOverridePolicy || undefined,
    annualDisclosureNotes: input.company?.annualDisclosureNotes || undefined,
    reportMode: (input.report.reportMode as ReportMode | undefined) || undefined,
    baseYear: input.report.baseYear ?? input.company?.defaultBaseYear ?? undefined,
    baseYearNotes:
      input.report.baseYearNotes || input.company?.defaultBaseYearNotes || undefined,
    baseYearRecalculationPolicy:
      input.report.baseYearRecalculationPolicy ||
      input.company?.defaultBaseYearRecalculationPolicy ||
      undefined,
    scope2Method,
    scope2LocationBasedEmissions,
    scope2MarketBasedEmissions:
      input.report.scope2MarketBasedEmissions ??
      input.company?.defaultScope2MarketBasedEmissions ??
      undefined,
    scope2DisclosureNotes:
      input.report.scope2DisclosureNotes ||
      input.company?.defaultScope2DisclosureNotes ||
      undefined,
    scope2InstrumentNotes:
      input.report.scope2InstrumentNotes ||
      input.company?.defaultScope2InstrumentNotes ||
      undefined,
  });
  const boundaryMetadata = buildReportBoundaryMetadata(input.entries, input.report.reportingPeriod, {
    boundarySummary: input.report.boundarySummary || undefined,
    exclusions: input.report.boundaryExclusions || undefined,
    organizationalBoundaryMethod,
    organizationalBoundaryNotes:
      input.report.organizationalBoundaryNotes ||
      input.company?.defaultOrganizationalBoundaryNotes ||
      undefined,
  });

  return {
    methodologyMetadata,
    boundaryMetadata,
  };
}

function sumScope2LocationBasedEmissions(entries: DisclosureDepartmentEntry[]) {
  return Number(
    entries
      .filter((entry) => entry.category === 'Scope 2')
      .reduce((sum, entry) => sum + entry.co2Equivalent, 0)
      .toFixed(2)
  );
}

function normalizeApprovedAt(value?: Date | string | null) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function buildAppendixDisclosureContext(
  report: Pick<ReportDisclosureSnapshot, 'reportMode' | 'reportingPeriod'>,
  methodologyMetadata: ReportMethodologyMetadata,
  boundaryMetadata: ReportBoundaryMetadata
) {
  return {
    reportMode: report.reportMode || null,
    reportingPeriod: report.reportingPeriod,
    reportOwnerName: methodologyMetadata.reportOwnerName || null,
    reportOwnerEmail: methodologyMetadata.reportOwnerEmail || null,
    reportingStandard: methodologyMetadata.reportingStandard,
    gwpBasis: methodologyMetadata.gwpBasis,
    boundarySummary: boundaryMetadata.boundarySummary,
    boundaryExclusions: boundaryMetadata.exclusions,
    approvalWorkflow: methodologyMetadata.approvalWorkflow || null,
    scope2Method: methodologyMetadata.scope2Method || null,
    scope2LocationBasedEmissions:
      methodologyMetadata.scope2LocationBasedEmissions ?? null,
    scope2MarketBasedEmissions:
      methodologyMetadata.scope2MarketBasedEmissions ?? null,
  };
}

function normalizeBoundaryMethod(
  value?: OrganizationalBoundaryMethod | string | null
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

function normalizeScope2Method(
  value?: Scope2Method | string | null
): Scope2Method | undefined {
  switch (value) {
    case 'location_based':
    case 'market_based':
    case 'dual_reporting':
      return value;
    default:
      return undefined;
  }
}
