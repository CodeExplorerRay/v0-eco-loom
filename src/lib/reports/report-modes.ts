import type { ReportMode } from '@/lib/types';

export type ReportModeProfile = {
  mode: ReportMode;
  label: string;
  description: string;
  audienceLabel: string;
  coverKicker: string;
  coverStatement: string;
  disclaimerText: string;
  exportSlug: string;
  coverBrandLabel: string;
  usesLockedMethodologyTemplate?: boolean;
  lockedMethodologySummary?: string;
  showBoundary: boolean;
  showMethodology: boolean;
  showOperationalBreakdown: boolean;
  showRecommendations: boolean;
  showFactorProvenance: boolean;
  showAppendices: boolean;
  showVerifierManifest: boolean;
};

export type ReportModeMethodologyTemplate = {
  reportingStandard?: string;
  gwpBasis?: string;
  factorSourcePolicy?: string;
  overridePolicy?: string;
  methodologyPrefix?: string;
};

const REPORT_MODE_PROFILES: Record<ReportMode, ReportModeProfile> = {
  internal_management: {
    mode: 'internal_management',
    label: 'Internal Management',
    description: 'Operational view for sustainability and program teams managing day-to-day performance.',
    audienceLabel: 'Internal teams',
    coverKicker: 'Operational carbon management pack',
    coverStatement:
      'Prepared for internal sustainability operations, performance monitoring, and day-to-day reporting discipline.',
    disclaimerText:
      'Internal management reports are intended for operational planning and should be paired with verifier-ready outputs for external assurance workflows.',
    exportSlug: 'internal-management',
    coverBrandLabel: 'Internal Use',
    usesLockedMethodologyTemplate: false,
    showBoundary: true,
    showMethodology: true,
    showOperationalBreakdown: true,
    showRecommendations: true,
    showFactorProvenance: true,
    showAppendices: false,
    showVerifierManifest: false,
  },
  verifier_ready: {
    mode: 'verifier_ready',
    label: 'Verifier Ready',
    description: 'Assurance-oriented package with methodology, provenance, appendix registers, and manifest details.',
    audienceLabel: 'External reviewers',
    coverKicker: 'Assurance support package',
    coverStatement:
      'Prepared for external reviewers with explicit methodology, provenance, appendix registers, and manifest context.',
    disclaimerText:
      'Verifier-ready reports are designed to support external review but do not replace an independent assurance opinion or certification decision.',
    exportSlug: 'verifier-ready',
    coverBrandLabel: 'Verifier Package',
    usesLockedMethodologyTemplate: true,
    lockedMethodologySummary:
      'Verifier-ready mode enforces a stronger external-review methodology template with explicit provenance and override language.',
    showBoundary: true,
    showMethodology: true,
    showOperationalBreakdown: true,
    showRecommendations: true,
    showFactorProvenance: true,
    showAppendices: true,
    showVerifierManifest: true,
  },
  board_summary: {
    mode: 'board_summary',
    label: 'Board Summary',
    description: 'Condensed executive view focused on trend, total emissions, gaps, and high-level recommendations.',
    audienceLabel: 'Executives and board stakeholders',
    coverKicker: 'Executive reporting brief',
    coverStatement:
      'Prepared for leadership review with a concise focus on trend, risks, and strategic action areas.',
    disclaimerText:
      'Board summary reports intentionally condense methodology and appendix detail; consult verifier-ready or annual disclosure reports for deeper review context.',
    exportSlug: 'board-summary',
    coverBrandLabel: 'Board Brief',
    usesLockedMethodologyTemplate: false,
    showBoundary: false,
    showMethodology: false,
    showOperationalBreakdown: true,
    showRecommendations: true,
    showFactorProvenance: false,
    showAppendices: false,
    showVerifierManifest: false,
  },
  annual_disclosure: {
    mode: 'annual_disclosure',
    label: 'Annual Disclosure',
    description: 'Standards-oriented annual disclosure format with boundary, methodology, provenance, and appendices.',
    audienceLabel: 'Disclosure and compliance audiences',
    coverKicker: 'Standards-oriented disclosure package',
    coverStatement:
      'Prepared for annual sustainability disclosure with boundary, methodology, provenance, and governance context aligned to formal reporting needs.',
    disclaimerText:
      'Annual disclosure reports are intended to support structured sustainability reporting and should be reviewed alongside organization-specific disclosure controls and external assurance requirements.',
    exportSlug: 'annual-disclosure',
    coverBrandLabel: 'Disclosure Draft',
    usesLockedMethodologyTemplate: true,
    lockedMethodologySummary:
      'Annual disclosure mode enforces standards-heavy wording intended for formal external sustainability reporting.',
    showBoundary: true,
    showMethodology: true,
    showOperationalBreakdown: true,
    showRecommendations: true,
    showFactorProvenance: true,
    showAppendices: true,
    showVerifierManifest: true,
  },
};

export function getReportModeProfile(mode?: string | null): ReportModeProfile {
  if (!mode) {
    return REPORT_MODE_PROFILES.internal_management;
  }

  return REPORT_MODE_PROFILES[mode as ReportMode] || REPORT_MODE_PROFILES.internal_management;
}

const REPORT_MODE_METHODOLOGY_TEMPLATES: Partial<
  Record<ReportMode, ReportModeMethodologyTemplate>
> = {
  verifier_ready: {
    reportingStandard: 'GHG Protocol Corporate Standard',
    gwpBasis:
      'Verifier-ready reporting basis with published factor provenance, disclosed GWP context, and explicit treatment of supplemental and overridden factors.',
    factorSourcePolicy:
      'Verifier-ready reports prioritize the approved Eco-Loom factor library, disclose any supplemental factor usage, and carry entry-level provenance into the assurance package.',
    overridePolicy:
      'Custom factor overrides are restricted to admins, require documented rationale, actor, and timestamp, and are always surfaced in the override register for external review.',
    methodologyPrefix:
      'This report uses the locked verifier-ready methodology template to maintain consistent language for external review and assurance support.',
  },
  annual_disclosure: {
    reportingStandard: 'GHG Protocol Corporate Standard',
    gwpBasis:
      'Annual disclosure reporting basis with standards-oriented provenance language, published factor context, and explicit disclosure of overrides and limitations.',
    factorSourcePolicy:
      'Annual disclosure reports use the approved Eco-Loom factor library as the primary source hierarchy and explicitly disclose supplemental factors, provenance coverage, and unresolved quality items.',
    overridePolicy:
      'Any custom factor override must be admin-approved, documented with rationale and timestamp, and disclosed in annual reporting appendices for traceability.',
    methodologyPrefix:
      'This report uses the locked annual-disclosure methodology template to keep external sustainability reporting language consistent and standards-oriented.',
  },
};

export function getReportModeMethodologyTemplate(
  mode?: string | null
): ReportModeMethodologyTemplate | null {
  if (!mode) {
    return null;
  }

  return REPORT_MODE_METHODOLOGY_TEMPLATES[mode as ReportMode] || null;
}
