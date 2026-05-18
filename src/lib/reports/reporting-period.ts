export type ReportingPeriodKind = 'month' | 'quarter' | 'year';

export type ReportingPeriodWindow = {
  kind: ReportingPeriodKind;
  reportingPeriod: string;
  startDate: Date;
  endDateExclusive: Date;
};

function toUtcDate(year: number, monthIndex: number, day: number = 1) {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function parseReportingPeriod(reportingPeriod: string): ReportingPeriodWindow {
  if (/^\d{4}-\d{2}$/.test(reportingPeriod)) {
    const [year, month] = reportingPeriod.split('-').map(Number);
    return {
      kind: 'month',
      reportingPeriod,
      startDate: toUtcDate(year, month - 1, 1),
      endDateExclusive: toUtcDate(year, month, 1),
    };
  }

  if (/^\d{4}-Q[1-4]$/.test(reportingPeriod)) {
    const [yearText, quarterText] = reportingPeriod.split('-Q');
    const year = Number(yearText);
    const quarter = Number(quarterText);
    const startMonth = (quarter - 1) * 3;

    return {
      kind: 'quarter',
      reportingPeriod,
      startDate: toUtcDate(year, startMonth, 1),
      endDateExclusive: toUtcDate(year, startMonth + 3, 1),
    };
  }

  if (/^\d{4}$/.test(reportingPeriod)) {
    const year = Number(reportingPeriod);
    return {
      kind: 'year',
      reportingPeriod,
      startDate: toUtcDate(year, 0, 1),
      endDateExclusive: toUtcDate(year + 1, 0, 1),
    };
  }

  throw new Error(`Unsupported reporting period "${reportingPeriod}"`);
}

export function buildTransactionDateRange(reportingPeriod: string) {
  const parsed = parseReportingPeriod(reportingPeriod);

  return {
    gte: parsed.startDate,
    lt: parsed.endDateExclusive,
  };
}

export function getPreviousReportingPeriod(reportingPeriod: string) {
  const parsed = parseReportingPeriod(reportingPeriod);

  if (parsed.kind === 'month') {
    const previousMonth = toUtcDate(
      parsed.startDate.getUTCFullYear(),
      parsed.startDate.getUTCMonth() - 1,
      1
    );
    return `${previousMonth.getUTCFullYear()}-${String(previousMonth.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  if (parsed.kind === 'quarter') {
    const previousQuarterDate = toUtcDate(
      parsed.startDate.getUTCFullYear(),
      parsed.startDate.getUTCMonth() - 3,
      1
    );
    const previousQuarter = Math.floor(previousQuarterDate.getUTCMonth() / 3) + 1;
    return `${previousQuarterDate.getUTCFullYear()}-Q${previousQuarter}`;
  }

  return String(parsed.startDate.getUTCFullYear() - 1);
}

export function formatReportingPeriodLabel(reportingPeriod: string) {
  const parsed = parseReportingPeriod(reportingPeriod);

  if (parsed.kind === 'month') {
    return parsed.startDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  if (parsed.kind === 'quarter') {
    return reportingPeriod;
  }

  return String(parsed.startDate.getUTCFullYear());
}

export function formatMonthlyReportingPeriod(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function isValidReportingPeriod(reportingPeriod: string) {
  try {
    parseReportingPeriod(reportingPeriod);
    return true;
  } catch {
    return false;
  }
}
