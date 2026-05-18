import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { archiveGoalInNotion, syncGoalsToNotion } from '@/lib/server/notion-sync';

// GET - Fetch a specific goal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;
  
  try {
    const goal = await db.sustainabilityGoal.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const companyError = assertCompanyAccess(auth.session, goal.companyId);
    if (companyError) {
      return companyError;
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json({ error: 'Failed to fetch goal' }, { status: 500 });
  }
}

// PATCH - Update a goal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;
  
  try {
    const existingGoal = await db.sustainabilityGoal.findUnique({
      where: { id },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const companyError = assertCompanyAccess(auth.session, existingGoal.companyId);
    if (companyError) {
      return companyError;
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      currentValue, 
      progressPercent, 
      status 
    } = body;

    const updateData: Record<string, unknown> = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (currentValue !== undefined) updateData.currentValue = parseFloat(currentValue);
    if (progressPercent !== undefined) updateData.progressPercent = parseFloat(progressPercent);
    if (status !== undefined) updateData.status = status;

    const goal = await db.sustainabilityGoal.update({
      where: { id },
      data: updateData,
      include: { department: true },
    });

    await createAuditLog(auth.session, {
      action: 'update',
      entityType: 'sustainability_goal',
      entityId: id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        changes: updateData,
      }),
    });

    const goalSync = await syncGoalsToNotion({
      companyId: existingGoal.companyId,
      goalIds: [goal.id],
    });

    const refreshedGoal =
      goalSync.status === 'completed' && goalSync.result.success > 0
        ? await db.sustainabilityGoal.findUnique({
            where: { id: goal.id },
            include: { department: true },
          })
        : null;

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

// DELETE - Delete a goal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;
  
  try {
    const existingGoal = await db.sustainabilityGoal.findUnique({
      where: { id },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const companyError = assertCompanyAccess(auth.session, existingGoal.companyId);
    if (companyError) {
      return companyError;
    }

    if (existingGoal.notionPageId) {
      const notionArchive = await archiveGoalInNotion({
        companyId: existingGoal.companyId,
        goalId: id,
      });

      if (notionArchive.status === 'skipped') {
        return NextResponse.json(
          {
            error: `This goal is linked to Notion and could not be archived automatically. ${notionArchive.reason}`,
          },
          { status: 409 }
        );
      }
    }

    await createAuditLog(auth.session, {
      action: 'delete',
      entityType: 'sustainability_goal',
      entityId: id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        deletedAt: new Date().toISOString(),
      }),
    });

    await db.sustainabilityGoal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
}
