import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDemoLedgerSeedCoverage } from '@/lib/demo-workspace-seed';
import { buildMonthlyEmissionSeries } from '@/lib/dashboard/monthly-series';
import { buildGapAnalysisOverview } from '@/lib/gap-analysis';
import {
  getDashboardMetrics,
  getDepartmentEmissions,
  getEmissionsByCategory,
  resolveAnnualEmissionsBudgetTarget,
} from '@/lib/sync-service';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const departmentId = searchParams.get('departmentId');
  const months = Number.parseInt(searchParams.get('months') || '12', 10);
  const companyError = assertCompanyAccess(auth.session, companyId);
  if (companyError) {
    return companyError;
  }

  const safeMonths = Number.isFinite(months) && months > 0 ? months : 12;

  try {
    await ensureDemoLedgerSeedCoverage(db, { companyId: companyId! });

    const [metricsResult, entriesResult, departmentsResult, goalsResult] =
      await Promise.allSettled([
        getDashboardMetrics(companyId!, departmentId),
        db.carbonLedgerEntry.findMany({
          where: {
            companyId: companyId!,
            ...(departmentId ? { departmentId } : {}),
          },
          include: { department: true },
          orderBy: { transactionDate: 'asc' },
        }),
        db.department.findMany({
          where: departmentId
            ? { companyId: companyId!, id: departmentId }
            : { companyId: companyId! },
        }),
        db.sustainabilityGoal.findMany({
          where: departmentId
            ? {
                companyId: companyId!,
                OR: [{ departmentId }, { departmentId: null }],
              }
            : { companyId: companyId! },
          include: {
            department: true,
          },
        }),
      ]);

    const metrics = metricsResult.status === 'fulfilled' ? metricsResult.value : null;
    const entries = entriesResult.status === 'fulfilled' ? entriesResult.value : [];
    const departments =
      departmentsResult.status === 'fulfilled' ? departmentsResult.value : [];
    const goals = goalsResult.status === 'fulfilled' ? goalsResult.value : [];

    const summaryMetrics = metrics
      ? {
          totalCo2eThisMonth: metrics.totalCo2eThisMonth,
          emissionsVsTarget: metrics.emissionsVsTarget,
          activeDepartments: metrics.activeDepartments,
          complianceScore: metrics.complianceScore,
          trend: metrics.trend,
          trendPercent: metrics.trendPercent,
        }
      : {
          totalCo2eThisMonth: 0,
          emissionsVsTarget: 0,
          activeDepartments: departments.length,
          complianceScore: goals.length
            ? Math.round(
                (goals.filter((goal) => goal.status === 'on_track' || goal.status === 'achieved')
                  .length /
                  goals.length) *
                  100
              )
            : 0,
          trend: 'stable' as const,
          trendPercent: 0,
        };

    const emissionsByCategory = await getEmissionsByCategory(companyId!, departmentId);

    const totalEmissions = entries.reduce((sum, entry) => sum + entry.co2Equivalent, 0);
    const departmentEmissions = await getDepartmentEmissions(companyId!, departmentId);

    const monthlyTarget =
      (resolveAnnualEmissionsBudgetTarget(goals, departmentId) || 140000) / 12;
    const monthlyEmissions = buildMonthlyEmissionSeries(entries, safeMonths, monthlyTarget);

    const verifiedEntries = entries.filter((entry) => entry.verified);
    const gapAnalysis = buildGapAnalysisOverview(goals, {
      totalEmissions,
      verifiedEmissions: verifiedEntries.reduce((sum, entry) => sum + entry.co2Equivalent, 0),
      verificationRate: entries.length > 0 ? (verifiedEntries.length / entries.length) * 100 : 0,
    });

    return NextResponse.json(
      {
        ...summaryMetrics,
        scope1: emissionsByCategory.scope1,
        scope2: emissionsByCategory.scope2,
        scope3: emissionsByCategory.scope3,
        emissionsByCategory,
        monthlyEmissions,
        departmentEmissions,
        gapAnalysis,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);

    return NextResponse.json(
      {
        totalCo2eThisMonth: 0,
        emissionsVsTarget: 0,
        activeDepartments: 0,
        complianceScore: 0,
        trend: 'stable',
        trendPercent: 0,
        scope1: 0,
        scope2: 0,
        scope3: 0,
        emissionsByCategory: {
          scope1: 0,
          scope2: 0,
          scope3: 0,
        },
        monthlyEmissions: [],
        departmentEmissions: [],
        gapAnalysis: {
          goalsAtRisk: 0,
          goalsOnTrack: 0,
          goalsAchieved: 0,
          totalGap: 0,
          totalGoals: 0,
          activeGapCount: 0,
          gapTotalsByUnit: [],
          topGaps: [],
          largestGap: null,
        },
        fallback: true,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
