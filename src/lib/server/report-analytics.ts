import { db } from '@/lib/db';
import type { EmissionScope, SourceType } from '@/lib/types';
import { buildTransactionDateRange } from '@/lib/reports/reporting-period';
import {
  getTrendWindowForReportingPeriod,
  summarizeReportAnalytics,
} from '@/lib/reports/report-analytics';

export async function getReportAnalytics(
  companyId: string,
  reportingPeriod: string,
  departmentId?: string | null
) {
  const reportingWindow = buildTransactionDateRange(reportingPeriod);
  const trendWindow = getTrendWindowForReportingPeriod(reportingPeriod);
  const [entries, company, trendEntries] = await Promise.all([
    db.carbonLedgerEntry.findMany({
      where: {
        companyId,
        transactionDate: reportingWindow,
        ...(departmentId ? { departmentId } : {}),
      },
      select: {
        category: true,
        sourceType: true,
        co2Equivalent: true,
        verified: true,
        factorOverridden: true,
        factorSourceFamily: true,
        sourceDocument: true,
        department: {
          select: {
            name: true,
            code: true,
            budget: true,
          },
        },
      },
    }),
    db.company.findUnique({
      where: { id: companyId },
      select: {
        employeeCount: true,
        annualRevenue: true,
        facilityCount: true,
      },
    }),
    db.carbonLedgerEntry.findMany({
      where: {
        companyId,
        ...(departmentId ? { departmentId } : {}),
        transactionDate: {
          gte: trendWindow.trendStartDate,
          lt: trendWindow.endDateExclusive,
        },
      },
      select: {
        transactionDate: true,
        co2Equivalent: true,
      },
      orderBy: {
        transactionDate: 'asc',
      },
    }),
  ]);

  const analyticsEntries = entries.map((entry) => ({
    ...entry,
    category: entry.category as EmissionScope,
    sourceType: entry.sourceType as SourceType,
  }));

  return summarizeReportAnalytics(analyticsEntries, {
    reportingPeriod,
    monthlyTrendEntries: trendEntries,
    intensityDenominators: {
      employeeCount: company?.employeeCount,
      annualRevenue: company?.annualRevenue,
      facilityCount: company?.facilityCount,
    },
  });
}
