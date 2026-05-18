import { formatCo2e } from '@/lib/utils';

type ReportProvenanceEntry = {
  factorSource?: string | null;
  factorSourceFamily?: string | null;
  factorMethodology?: string | null;
  factorYear?: number | null;
  factorOverridden?: boolean;
  factorOverrideReason?: string | null;
  co2Equivalent: number;
};

export interface ReportFactorSourceBreakdown {
  label: string;
  entries: number;
  emissions: number;
}

export interface ReportFactorProvenanceSummary {
  totalEntries: number;
  overriddenEntries: number;
  officialEntries: number;
  supplementalEntries: number;
  approvedEntries: number;
  unknownEntries: number;
  overriddenEmissions: number;
  sourceBreakdown: ReportFactorSourceBreakdown[];
  methodologyList: string[];
  summaryText: string;
}

export function summarizeReportFactorProvenance(
  entries: ReportProvenanceEntry[]
): ReportFactorProvenanceSummary {
  const totalEntries = entries.length;
  const overriddenEntries = entries.filter((entry) => entry.factorOverridden).length;
  const officialEntries = entries.filter((entry) => entry.factorSourceFamily === 'EPA').length;
  const supplementalEntries = entries.filter(
    (entry) => !entry.factorOverridden && entry.factorSourceFamily === 'SUPPLEMENTAL'
  ).length;
  const approvedEntries = entries.filter(
    (entry) => !entry.factorOverridden && Boolean(entry.factorSourceFamily)
  ).length;
  const unknownEntries = entries.filter(
    (entry) => !entry.factorOverridden && !entry.factorSourceFamily
  ).length;
  const overriddenEmissions = entries
    .filter((entry) => entry.factorOverridden)
    .reduce((sum, entry) => sum + entry.co2Equivalent, 0);

  const sourceMap = new Map<string, ReportFactorSourceBreakdown>();
  for (const entry of entries) {
    const label = entry.factorOverridden
      ? `Override: ${entry.factorSource || 'Custom factor'}`
      : entry.factorSource || entry.factorSourceFamily || 'Unspecified factor source';
    const current = sourceMap.get(label);
    if (current) {
      current.entries += 1;
      current.emissions += entry.co2Equivalent;
    } else {
      sourceMap.set(label, {
        label,
        entries: 1,
        emissions: entry.co2Equivalent,
      });
    }
  }

  const methodologyList = Array.from(
    new Set(
      entries
        .map((entry) => entry.factorMethodology)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const summaryParts: string[] = [];
  if (totalEntries > 0) {
    summaryParts.push(
      `${officialEntries} of ${totalEntries} entries use official EPA-backed factors`
    );
    if (supplementalEntries > 0) {
      summaryParts.push(`${supplementalEntries} use approved supplemental factors`);
    }
    if (overriddenEntries > 0) {
      summaryParts.push(
        `${overriddenEntries} use documented admin overrides covering ${formatCo2e(overriddenEmissions)}`
      );
    }
    if (unknownEntries > 0) {
      summaryParts.push(`${unknownEntries} entries are missing factor provenance and need review`);
    }
  }

  return {
    totalEntries,
    overriddenEntries,
    officialEntries,
    supplementalEntries,
    approvedEntries,
    unknownEntries,
    overriddenEmissions,
    sourceBreakdown: Array.from(sourceMap.values()).sort((left, right) => right.entries - left.entries),
    methodologyList,
    summaryText:
      summaryParts.length > 0
        ? `${summaryParts.join('. ')}.`
        : 'No factor provenance data is available for this reporting period.',
  };
}
