import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { syncGoalsToNotion } from '@/lib/server/notion-sync';
import { recalculateGoalProgress } from '@/lib/sync-service';

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
    await recalculateGoalProgress(companyId!);

    const goals = await db.sustainabilityGoal.findMany({
      where: departmentId
        ? {
            companyId: companyId!,
            OR: [{ departmentId }, { departmentId: null }],
          }
        : { companyId: companyId! },
      include: { department: true },
      orderBy: { targetYear: 'asc' },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      goalType, 
      targetValue, 
      targetUnit, 
      baselineValue,
      baselineYear,
      targetYear, 
      departmentId,
      companyId,
    } = body;

    const companyError = assertCompanyAccess(auth.session, companyId);
    if (companyError) {
      return companyError;
    }

    if (!title || !goalType || targetValue === undefined || !targetUnit || !targetYear || !companyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (departmentId) {
      const department = await db.department.findFirst({
        where: {
          id: departmentId,
          companyId: companyId!,
        },
        select: { id: true },
      });

      if (!department) {
        return NextResponse.json({ error: 'Facility / site not found' }, { status: 404 });
      }
    }

    const goal = await db.sustainabilityGoal.create({
      data: {
        title,
        description,
        goalType,
        targetValue: parseFloat(targetValue),
        targetUnit,
        baselineValue: baselineValue ? parseFloat(baselineValue) : null,
        baselineYear: baselineYear ? parseInt(baselineYear) : null,
        targetYear: parseInt(targetYear),
        currentValue: 0,
        progressPercent: 0,
        status: 'on_track',
        departmentId: departmentId || null,
        companyId: companyId!,
      },
      include: { department: true },
    });

    await createAuditLog(auth.session, {
      action: 'create',
      entityType: 'goal',
      entityId: goal.id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        title,
        goalType,
        targetValue,
      }),
    });

    const goalSync = await syncGoalsToNotion({
      companyId: companyId!,
      goalIds: [goal.id],
    });

    const refreshedGoal =
      goalSync.status === 'completed' && goalSync.result.success > 0
        ? await db.sustainabilityGoal.findUnique({
            where: { id: goal.id },
            include: { department: true },
          })
        : null;

    return NextResponse.json(
      {
        ...(refreshedGoal || goal),
        notionSync:
          goalSync.status === 'completed'
            ? goalSync.result.failed > 0
              ? {
                  status: 'failed',
                  reason: goalSync.result.errors[0]?.error || 'Notion sync failed',
                }
              : {
                  status: 'synced',
                }
            : {
                status: 'skipped',
                reason: goalSync.reason,
              },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}
