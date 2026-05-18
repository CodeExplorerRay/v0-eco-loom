import type { MonthlyEmissions } from '@/lib/types';

type MonthlySeriesEntry = {
  transactionDate: Date | string;
  co2Equivalent: number;
  verified?: boolean;
};

type MonthlyAggregate = {
  emissions: number;
  entryCount: number;
  verifiedEmissions: number;
};

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function getSafeDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function buildMonthlyEmissionSeries(
  entries: MonthlySeriesEntry[],
  months: number,
  target?: number,
  anchorDate?: Date | string
): MonthlyEmissions[] {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const aggregates = new Map<string, MonthlyAggregate>();

  for (const entry of entries) {
    const transactionDate = getSafeDate(entry.transactionDate);
    if (!transactionDate) {
      continue;
    }

    const monthKey = getMonthKey(transactionDate);
    const current = aggregates.get(monthKey) || {
      emissions: 0,
      entryCount: 0,
      verifiedEmissions: 0,
    };
    const amount = Number.isFinite(entry.co2Equivalent) ? entry.co2Equivalent : 0;

    current.emissions += amount;
    current.entryCount += 1;
    if (entry.verified) {
      current.verifiedEmissions += amount;
    }

    aggregates.set(monthKey, current);
  }

  const safeMonths = Number.isFinite(months) && months > 0 ? Math.min(months, 24) : 12;
  const resolvedAnchorDate = getSafeDate(anchorDate ?? new Date());
  if (!resolvedAnchorDate) {
    return [];
  }

  const latestMonthStart = getMonthStart(resolvedAnchorDate);

  const series: MonthlyEmissions[] = [];
  for (let index = safeMonths - 1; index >= 0; index -= 1) {
    const monthStart = new Date(
      Date.UTC(
        latestMonthStart.getUTCFullYear(),
        latestMonthStart.getUTCMonth() - index,
        1
      )
    );
    const monthKey = getMonthKey(monthStart);
    const aggregate = aggregates.get(monthKey);
    const emissions = aggregate?.emissions ?? 0;
    const verifiedEmissions = aggregate?.verifiedEmissions ?? 0;

    series.push({
      month: monthKey,
      emissions: roundToTwo(emissions),
      target: typeof target === 'number' && Number.isFinite(target) ? roundToTwo(target) : undefined,
      label: getMonthLabel(monthStart),
      entryCount: aggregate?.entryCount ?? 0,
      verifiedEmissions: roundToTwo(verifiedEmissions),
      verificationRate: emissions > 0 ? roundToTwo((verifiedEmissions / emissions) * 100) : 0,
    });
  }

  return series;
}
