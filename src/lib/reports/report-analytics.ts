import type {
  EmissionScope,
  ReportAnalyticsSummary,
  ReportIntensityMetric,
  ReportTrendPoint,
  SourceType,
} from '@/lib/types';
import { parseReportingPeriod } from '@/lib/reports/reporting-period';

type AnalyticsEntry = {
  category: EmissionScope;
  sourceType: SourceType;
  co2Equivalent: number;
  verified: boolean;
  factorOverridden?: boolean | null;
  factorSourceFamily?: string | null;
  sourceDocument?: string | null;
  department?: {
    name?: string | null;
    code?: string | null;
    budget?: number | null;
  } | null;
};

type TrendEntry = {
  transactionDate: Date | string;
  co2Equivalent: number;
};

type ReportAnalyticsOptions = {
  reportingPeriod?: string;
  monthlyTrendEntries?: TrendEntry[];
  intensityDenominators?: {
    employeeCount?: number | null;
    annualRevenue?: number | null;
    facilityCount?: number | null;
  };
};

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  electricity: 'Electricity',
  travel: 'Travel',
  shipping: 'Shipping',
  gas: 'Gas',
  waste: 'Waste',
  water: 'Water',
  other: 'Other',
};

export function summarizeReportAnalytics(
  entries: AnalyticsEntry[],
  options: ReportAnalyticsOptions = {}
): ReportAnalyticsSummary {
  const totalEntries = entries.length;
  const totalEmissions = entries.reduce((sum, entry) => sum + entry.co2Equivalent, 0);

  const breakdownByScope = buildBreakdown(
    groupEntries(entries, (entry) => entry.category),
    totalEmissions
  );

  const breakdownBySourceType = buildBreakdown(
    groupEntries(entries, (entry) => SOURCE_TYPE_LABELS[entry.sourceType]),
    totalEmissions
  );

  const breakdownByDepartment = buildDepartmentBreakdown(entries, totalEmissions);

  const verifiedEntries = entries.filter((entry) => entry.verified).length;
  const overriddenEntries = entries.filter((entry) => Boolean(entry.factorOverridden)).length;
  const officialEntries = entries.filter(
    (entry) => entry.factorSourceFamily?.toUpperCase() === 'EPA'
  ).length;
  const supplementalEntries = entries.filter(
    (entry) => entry.factorSourceFamily?.toUpperCase() === 'SUPPLEMENTAL'
  ).length;
  const unknownProvenanceEntries = entries.filter((entry) => !entry.factorSourceFamily).length;
  const entriesWithSourceDocument = entries.filter((entry) => Boolean(entry.sourceDocument)).length;
  const monthlyTrend = buildMonthlyTrend(
    options.monthlyTrendEntries ?? [],
    options.reportingPeriod
  );
  const intensityMetrics = buildIntensityMetrics(entries, totalEmissions, options.intensityDenominators);

  return {
    totalEntries,
    totalEmissions,
    breakdownByScope,
    breakdownBySourceType,
    breakdownByDepartment,
    topEmissionSources: [...breakdownBySourceType]
      .sort((a, b) => b.emissions - a.emissions)
      .slice(0, 5),
    topDepartments: [...breakdownByDepartment]
      .sort((a, b) => b.emissions - a.emissions)
      .slice(0, 5),
    monthlyTrend,
    intensityMetrics,
    quality: {
      totalEntries,
      verifiedEntries,
      unverifiedEntries: totalEntries - verifiedEntries,
      overriddenEntries,
      officialEntries,
      supplementalEntries,
      unknownProvenanceEntries,
      entriesWithSourceDocument,
      verificationRate: toPercent(verifiedEntries, totalEntries),
      evidenceCoverageRate: toPercent(entriesWithSourceDocument, totalEntries),
    },
  };
}

export function getTrendWindowForReportingPeriod(reportingPeriod: string) {
  try {
    const parsed = parseReportingPeriod(reportingPeriod);
    const trendStartDate =
      parsed.kind === 'year'
        ? new Date(Date.UTC(parsed.startDate.getUTCFullYear(), 0, 1))
        : new Date(
            Date.UTC(
              parsed.endDateExclusive.getUTCFullYear(),
              parsed.endDateExclusive.getUTCMonth() - 6,
              1
            )
          );

    return {
      startDate: parsed.startDate,
      endDateExclusive: parsed.endDateExclusive,
      trendStartDate,
    };
  } catch {
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endDateExclusive = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const trendStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    return { startDate, endDateExclusive, trendStartDate };
  }
}

function groupEntries(
  entries: AnalyticsEntry[],
  getLabel: (entry: AnalyticsEntry) => string
) {
  const grouped = new Map<string, { entries: number; emissions: number }>();

  for (const entry of entries) {
    const label = getLabel(entry) || 'Unassigned';
    const current = grouped.get(label) || { entries: 0, emissions: 0 };
    current.entries += 1;
    current.emissions += entry.co2Equivalent;
    grouped.set(label, current);
  }

  return grouped;
}

function buildBreakdown(
  grouped: Map<string, { entries: number; emissions: number }>,
  totalEmissions: number
) {
  return [...grouped.entries()]
    .map(([label, value]) => ({
      label,
      entries: value.entries,
      emissions: value.emissions,
      percent: toPercent(value.emissions, totalEmissions),
    }))
    .sort((a, b) => b.emissions - a.emissions);
}

function buildDepartmentBreakdown(entries: AnalyticsEntry[], totalEmissions: number) {
  const grouped = new Map<
    string,
    {
      departmentName: string;
      departmentCode?: string | null;
      entries: number;
      emissions: number;
      verifiedEntries: number;
      overriddenEntries: number;
    }
  >();

  for (const entry of entries) {
    const departmentName = entry.department?.name || 'Unassigned';
    const departmentCode = entry.department?.code || null;
    const key = `${departmentCode || 'none'}::${departmentName}`;
    const current = grouped.get(key) || {
      departmentName,
      departmentCode,
      entries: 0,
      emissions: 0,
      verifiedEntries: 0,
      overriddenEntries: 0,
    };

    current.entries += 1;
    current.emissions += entry.co2Equivalent;
    if (entry.verified) {
      current.verifiedEntries += 1;
    }
    if (entry.factorOverridden) {
      current.overriddenEntries += 1;
    }
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      percent: toPercent(item.emissions, totalEmissions),
    }))
    .sort((a, b) => b.emissions - a.emissions);
}

function buildMonthlyTrend(entries: TrendEntry[], reportingPeriod?: string): ReportTrendPoint[] {
  if (!entries.length) {
    return [];
  }

  const grouped = new Map<string, { emissions: number; entryCount: number; date: Date }>();

  for (const entry of entries) {
    const date = entry.transactionDate instanceof Date
      ? entry.transactionDate
      : new Date(entry.transactionDate);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const year = date.getFullYear();
    const month = date.getMonth();
    const period = `${year}-${String(month + 1).padStart(2, '0')}`;
    const bucketDate = new Date(year, month, 1);
    const current = grouped.get(period) || {
      emissions: 0,
      entryCount: 0,
      date: bucketDate,
    };

    current.emissions += entry.co2Equivalent;
    current.entryCount += 1;
    grouped.set(period, current);
  }

  const points = [...grouped.entries()]
    .map(([period, value]) => ({
      period,
      label: formatTrendLabel(value.date, reportingPeriod),
      emissions: Number(value.emissions.toFixed(2)),
      entryCount: value.entryCount,
      date: value.date,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return points.map(({ date, ...point }) => point);
}

function buildIntensityMetrics(
  entries: AnalyticsEntry[],
  totalEmissions: number,
  denominators?: ReportAnalyticsOptions['intensityDenominators']
): ReportIntensityMetric[] {
  const metrics: ReportIntensityMetric[] = [];
  const employeeCount = denominators?.employeeCount ?? null;
  const annualRevenue = denominators?.annualRevenue ?? null;
  const facilityCount = denominators?.facilityCount ?? null;

  if (employeeCount && employeeCount > 0) {
    metrics.push({
      label: 'Per Employee',
      value: roundMetric(totalEmissions / employeeCount),
      unit: 'kg CO2e / employee',
      denominator: employeeCount,
      denominatorLabel: 'employees',
      basis: `Based on the configured employee baseline of ${employeeCount} employees.`,
    });
  }

  if (annualRevenue && annualRevenue > 0) {
    const revenueMillions = annualRevenue / 1_000_000;
    if (revenueMillions > 0) {
      metrics.push({
        label: 'Per $1M Revenue',
        value: roundMetric(totalEmissions / revenueMillions),
        unit: 'kg CO2e / $1M revenue',
        denominator: Number(revenueMillions.toFixed(2)),
        denominatorLabel: '$1M revenue units',
        basis: 'Based on the configured annual revenue baseline for the reporting entity.',
      });
    }
  }

  if (facilityCount && facilityCount > 0) {
    metrics.push({
      label: 'Per Facility',
      value: roundMetric(totalEmissions / facilityCount),
      unit: 'kg CO2e / facility',
      denominator: facilityCount,
      denominatorLabel: 'facilities',
      basis: `Based on the configured facility baseline of ${facilityCount} active facilities.`,
    });
  }

  const trackedDepartmentBudget = getTrackedDepartmentBudget(entries);
  if (trackedDepartmentBudget > 0) {
    const budgetMillions = trackedDepartmentBudget / 1_000_000;
    metrics.push({
      label: 'Per $1M Facility Budget',
      value: roundMetric(totalEmissions / budgetMillions),
      unit: 'kg CO2e / $1M budget',
      denominator: Number(budgetMillions.toFixed(2)),
      denominatorLabel: '$1M tracked facility budget',
      basis:
        'Based on the combined annual budgets of facilities represented in the report ledger.',
    });
  }

  return metrics;
}

function getTrackedDepartmentBudget(entries: AnalyticsEntry[]) {
  const seen = new Set<string>();
  let totalBudget = 0;

  for (const entry of entries) {
    const departmentName = entry.department?.name;
    const departmentCode = entry.department?.code;
    const departmentBudget = entry.department?.budget;
    if (!departmentName || !departmentBudget || departmentBudget <= 0) {
      continue;
    }

    const key = `${departmentCode || 'none'}::${departmentName}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    totalBudget += departmentBudget;
  }

  return totalBudget;
}

function formatTrendLabel(date: Date, reportingPeriod?: string) {
  if (reportingPeriod && /^\d{4}$/.test(reportingPeriod)) {
    return date.toLocaleDateString('en-US', { month: 'short' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}

function toPercent(value: number, total: number) {
  if (!total || total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(1));
}
