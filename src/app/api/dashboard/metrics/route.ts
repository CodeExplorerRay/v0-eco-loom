import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDemoLedgerSeedCoverage } from '@/lib/demo-workspace-seed';
import { getDashboardMetrics } from '@/lib/sync-service';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const departmentId = searchParams.get('departmentId');
  const companyError = assertCompanyAccess(auth.session, companyId);
  if (companyError) {
    return companyError;
  }

  try {
    await ensureDemoLedgerSeedCoverage(db, { companyId: companyId! });

    // Use the sync service to get comprehensive metrics
    const metrics = await getDashboardMetrics(companyId!, departmentId);

    if (!metrics) {
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }

    return NextResponse.json({
      totalCo2eThisMonth: metrics.totalCo2eThisMonth,
      emissionsVsTarget: metrics.emissionsVsTarget,
      activeDepartments: metrics.activeDepartments,
      complianceScore: metrics.complianceScore,
      trend: metrics.trend,
      trendPercent: metrics.trendPercent,
      // Additional data for debugging/transparency
      totalEmissions: metrics.totalEmissions,
      scope1Total: metrics.scope1Total,
      scope2Total: metrics.scope2Total,
      scope3Total: metrics.scope3Total,
      currentPeriod: metrics.currentPeriod,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
