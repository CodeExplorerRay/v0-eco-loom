import type { ReportQualityIssue } from '@/lib/types';

const ALWAYS_BLOCKING_ISSUES = new Set(['no_evidence']);
const EXTERNAL_BLOCKING_ISSUES = new Set([
  'unverified_entries',
  'missing_source_documents',
  'unknown_factor_provenance',
  'missing_report_owner',
  'missing_approval_workflow',
  'missing_methodology_metadata',
  'missing_boundary_metadata',
  'annual_disclosure_period_mismatch',
  'missing_scope2_method',
  'missing_scope2_market_total',
]);

export function getBlockingPublicationIssues(
  reportMode: string | null | undefined,
  issues: ReportQualityIssue[]
) {
  const isExternalMode = reportMode === 'verifier_ready' || reportMode === 'annual_disclosure';

  return issues.filter((issue) => {
    if (ALWAYS_BLOCKING_ISSUES.has(issue.id)) {
      return true;
    }

    if (isExternalMode && (EXTERNAL_BLOCKING_ISSUES.has(issue.id) || issue.severity !== 'low')) {
      return true;
    }

    return false;
  });
}

export function buildPublicationBlockerMessage(issues: ReportQualityIssue[]) {
  if (issues.length === 0) {
    return 'The report is ready to publish.';
  }

  if (issues.length === 1) {
    return issues[0].description;
  }

  return `${issues.length} publication blockers must be resolved before this report can be published.`;
}
