import { db } from '@/lib/db';
import { summarizeReportFactorProvenance } from '@/lib/reports/factor-provenance';
import { buildTransactionDateRange } from '@/lib/reports/reporting-period';

export async function getReportFactorProvenance(
  companyId: string,
  reportingPeriod: string,
  departmentId?: string | null
) {
  const reportEntries = await db.carbonLedgerEntry.findMany({
    where: {
      companyId,
      transactionDate: buildTransactionDateRange(reportingPeriod),
      ...(departmentId ? { departmentId } : {}),
    },
    select: {
      factorSource: true,
      factorSourceFamily: true,
      factorMethodology: true,
      factorYear: true,
      factorOverridden: true,
      factorOverrideReason: true,
      co2Equivalent: true,
    },
  });

  return summarizeReportFactorProvenance(reportEntries);
}
