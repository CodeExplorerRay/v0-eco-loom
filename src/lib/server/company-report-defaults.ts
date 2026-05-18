import type {
  Company,
  OrganizationalBoundaryMethod,
  ReportMode,
  Scope2Method,
} from '@/lib/types';

type CompanyReportDefaultsInput = Pick<
  Company,
  | 'defaultReportMode'
  | 'defaultReportingStandard'
  | 'defaultGwpBasis'
  | 'defaultFactorSourcePolicy'
  | 'defaultOverridePolicy'
  | 'defaultReportOwnerName'
  | 'defaultReportOwnerEmail'
  | 'defaultReportReviewerIds'
  | 'defaultReportRecipients'
  | 'defaultApprovalWorkflow'
  | 'defaultOrganizationalBoundaryMethod'
  | 'defaultOrganizationalBoundaryNotes'
  | 'defaultBaseYear'
  | 'defaultBaseYearNotes'
  | 'defaultBaseYearRecalculationPolicy'
  | 'defaultScope2Method'
  | 'defaultScope2MarketBasedEmissions'
  | 'defaultScope2DisclosureNotes'
  | 'defaultScope2InstrumentNotes'
  | 'annualDisclosureNotes'
>;

type SanitizedCompanyReportDefaults = {
  defaultReportMode: ReportMode | null;
  defaultReportingStandard: string | null;
  defaultGwpBasis: string | null;
  defaultFactorSourcePolicy: string | null;
  defaultOverridePolicy: string | null;
  defaultReportOwnerName: string | null;
  defaultReportOwnerEmail: string | null;
  defaultReportReviewerIds: string | null;
  defaultReportRecipients: string | null;
  defaultApprovalWorkflow: string | null;
  defaultOrganizationalBoundaryMethod: OrganizationalBoundaryMethod | null;
  defaultOrganizationalBoundaryNotes: string | null;
  defaultBaseYear: number | null;
  defaultBaseYearNotes: string | null;
  defaultBaseYearRecalculationPolicy: string | null;
  defaultScope2Method: Scope2Method | null;
  defaultScope2MarketBasedEmissions: number | null;
  defaultScope2DisclosureNotes: string | null;
  defaultScope2InstrumentNotes: string | null;
  annualDisclosureNotes: string | null;
};

const REPORT_MODES: ReportMode[] = [
  'internal_management',
  'verifier_ready',
  'board_summary',
  'annual_disclosure',
];
const BOUNDARY_METHODS: OrganizationalBoundaryMethod[] = [
  'operational_control',
  'financial_control',
  'equity_share',
];
const SCOPE2_METHODS: Scope2Method[] = [
  'location_based',
  'market_based',
  'dual_reporting',
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizeOptionalInteger(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) {
    throw new Error('Expected a whole-number value.');
  }

  return parsed;
}

function normalizeOptionalFloat(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    throw new Error('Expected a numeric value.');
  }

  return parsed;
}

function normalizeRecipientEmails(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const emails = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    return null;
  }

  const invalidEmail = emails.find((email) => !EMAIL_PATTERN.test(email));
  if (invalidEmail) {
    throw new Error(`Default report recipients include an invalid email address: ${invalidEmail}`);
  }

  return [...new Set(emails)].slice(0, 25).join(', ');
}

export function sanitizeCompanyReportDefaults(
  input: CompanyReportDefaultsInput
): SanitizedCompanyReportDefaults {
  if (input.defaultReportMode && !REPORT_MODES.includes(input.defaultReportMode)) {
    throw new Error('Default report mode is not recognized.');
  }

  const defaultReportMode =
    input.defaultReportMode && REPORT_MODES.includes(input.defaultReportMode)
      ? input.defaultReportMode
      : null;

  const defaultReportOwnerEmail = normalizeOptionalText(input.defaultReportOwnerEmail, 240);
  if (defaultReportOwnerEmail && !EMAIL_PATTERN.test(defaultReportOwnerEmail)) {
    throw new Error('Default report owner email must be a valid email address.');
  }

  const defaultReportReviewerIds = normalizeReviewerIds(input.defaultReportReviewerIds);
  const defaultBaseYear = normalizeOptionalInteger(input.defaultBaseYear);
  const defaultScope2MarketBasedEmissions = normalizeOptionalFloat(
    input.defaultScope2MarketBasedEmissions
  );
  const defaultOrganizationalBoundaryMethod =
    input.defaultOrganizationalBoundaryMethod &&
    BOUNDARY_METHODS.includes(input.defaultOrganizationalBoundaryMethod)
      ? input.defaultOrganizationalBoundaryMethod
      : null;
  const defaultScope2Method =
    input.defaultScope2Method && SCOPE2_METHODS.includes(input.defaultScope2Method)
      ? input.defaultScope2Method
      : null;

  if (
    input.defaultOrganizationalBoundaryMethod &&
    !BOUNDARY_METHODS.includes(input.defaultOrganizationalBoundaryMethod)
  ) {
    throw new Error('Default organizational boundary method is not recognized.');
  }

  if (input.defaultScope2Method && !SCOPE2_METHODS.includes(input.defaultScope2Method)) {
    throw new Error('Default Scope 2 method is not recognized.');
  }

  if (
    defaultBaseYear !== null &&
    (defaultBaseYear < 1900 || defaultBaseYear > new Date().getFullYear() + 1)
  ) {
    throw new Error('Base year must be within a reasonable reporting range.');
  }

  if (
    defaultScope2MarketBasedEmissions !== null &&
    defaultScope2MarketBasedEmissions < 0
  ) {
    throw new Error('Market-based Scope 2 total must be zero or greater.');
  }

  if (
    (defaultScope2Method === 'market_based' || defaultScope2Method === 'dual_reporting') &&
    defaultScope2MarketBasedEmissions === null
  ) {
    throw new Error(
      'Market-based Scope 2 total is required when the default Scope 2 method is market-based or dual reporting.'
    );
  }

  return {
    defaultReportMode,
    defaultReportingStandard: normalizeOptionalText(input.defaultReportingStandard, 160),
    defaultGwpBasis: normalizeOptionalText(input.defaultGwpBasis, 240),
    defaultFactorSourcePolicy: normalizeOptionalText(input.defaultFactorSourcePolicy, 1000),
    defaultOverridePolicy: normalizeOptionalText(input.defaultOverridePolicy, 1000),
    defaultReportOwnerName: normalizeOptionalText(input.defaultReportOwnerName, 120),
    defaultReportOwnerEmail,
    defaultReportReviewerIds,
    defaultReportRecipients: normalizeRecipientEmails(input.defaultReportRecipients),
    defaultApprovalWorkflow: normalizeOptionalText(input.defaultApprovalWorkflow, 600),
    defaultOrganizationalBoundaryMethod,
    defaultOrganizationalBoundaryNotes: normalizeOptionalText(
      input.defaultOrganizationalBoundaryNotes,
      1000
    ),
    defaultBaseYear,
    defaultBaseYearNotes: normalizeOptionalText(input.defaultBaseYearNotes, 1000),
    defaultBaseYearRecalculationPolicy: normalizeOptionalText(
      input.defaultBaseYearRecalculationPolicy,
      1000
    ),
    defaultScope2Method,
    defaultScope2MarketBasedEmissions,
    defaultScope2DisclosureNotes: normalizeOptionalText(
      input.defaultScope2DisclosureNotes,
      1000
    ),
    defaultScope2InstrumentNotes: normalizeOptionalText(
      input.defaultScope2InstrumentNotes,
      1000
    ),
    annualDisclosureNotes: normalizeOptionalText(input.annualDisclosureNotes, 1500),
  };
}

function normalizeReviewerIds(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('Default reviewers must be a JSON array of user ids.');
    }

    const reviewerIds = parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);

    return reviewerIds.length > 0 ? JSON.stringify(reviewerIds.slice(0, 25)) : null;
  } catch {
    throw new Error('Default reviewers payload is invalid.');
  }
}
