import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildGapAnalysisOverview } from '@/lib/gap-analysis';
import { recalculateGoalProgress } from '@/lib/sync-service';
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
    // First recalculate goals to ensure they're up to date
    await recalculateGoalProgress(companyId!);

    // Then fetch updated goals
    const goals = await db.sustainabilityGoal.findMany({
      where: departmentId
        ? {
            companyId: companyId!,
            OR: [{ departmentId }, { departmentId: null }],
          }
        : { companyId: companyId! },
      include: {
        department: true,
      },
    });

    // Calculate emissions summary for context
    const entries = await db.carbonLedgerEntry.findMany({
      where: {
        companyId: companyId!,
        ...(departmentId ? { departmentId } : {}),
      },
    });

    const totalEmissions = entries.reduce((sum, e) => sum + e.co2Equivalent, 0);
    const verifiedEntries = entries.filter(e => e.verified);
    const verifiedEmissions = verifiedEntries.reduce((sum, e) => sum + e.co2Equivalent, 0);
    const gapAnalysis = buildGapAnalysisOverview(goals, {
      totalEmissions,
      verifiedEmissions,
      verificationRate:
        entries.length > 0 ? (verifiedEntries.length / entries.length) * 100 : 0,
    });

    return NextResponse.json(gapAnalysis);
  } catch (error) {
    console.error('Error fetching gap analysis:', error);
    return NextResponse.json({ error: 'Failed to fetch gap analysis' }, { status: 500 });
  }
}
