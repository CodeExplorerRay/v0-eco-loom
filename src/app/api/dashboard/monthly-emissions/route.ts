import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDemoLedgerSeedCoverage } from '@/lib/demo-workspace-seed';
import { buildMonthlyEmissionSeries } from '@/lib/dashboard/monthly-series';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';
import { resolveAnnualEmissionsBudgetTarget } from '@/lib/sync-service';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const departmentId = searchParams.get('departmentId');
  const months = parseInt(searchParams.get('months') || '12', 10);
  const companyError = assertCompanyAccess(auth.session, companyId);
  if (companyError) {
    return companyError;
  }

  const safeMonths = Number.isFinite(months) && months > 0 ? Math.min(months, 24) : 12;

  try {
    await ensureDemoLedgerSeedCoverage(db, { companyId: companyId! });

    const allEntries = await db.carbonLedgerEntry.findMany({
      where: {
        companyId: companyId!,
        ...(departmentId ? { departmentId } : {}),
      },
      select: {
        transactionDate: true,
        co2Equivalent: true,
        verified: true,
      },
      orderBy: { transactionDate: 'asc' },
    });

    const goals = await db.sustainabilityGoal.findMany({
      where: departmentId
        ? {
            companyId: companyId!,
            OR: [{ departmentId }, { departmentId: null }],
          }
        : { companyId: companyId! },
    });
    const monthlyTarget =
      (resolveAnnualEmissionsBudgetTarget(goals, departmentId) || 140000) / 12;
    const monthlyData = buildMonthlyEmissionSeries(allEntries, safeMonths, monthlyTarget);

    return NextResponse.json(monthlyData);
  } catch (error) {
    console.error('Error fetching monthly emissions:', error);
    return NextResponse.json({ error: 'Failed to fetch monthly emissions' }, { status: 500 });
  }
}
