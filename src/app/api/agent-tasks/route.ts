import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireApiSession } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const status = request.nextUrl.searchParams.get('status');
    const taskType = request.nextUrl.searchParams.get('taskType');
    const search = request.nextUrl.searchParams.get('search')?.trim();
    const requestedLimit = Number(request.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(10, Math.min(100, Math.trunc(requestedLimit)))
      : 50;

    const scopedWhere: Prisma.AgentTaskWhereInput = {
      payload: {
        contains: `"companyId":"${auth.session.companyId}"`,
      },
      ...(taskType && taskType !== 'all' ? { taskType } : {}),
      ...(search
        ? {
            OR: [
              { taskType: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { payload: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { result: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { errorMessage: { contains: search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };
    const where: Prisma.AgentTaskWhereInput = {
      ...scopedWhere,
      ...(status && status !== 'all' ? { status } : {}),
    };

    const [tasks, pending, running, completed, failed, retried] = await Promise.all([
      db.agentTask.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { scheduledAt: 'desc' }],
        take: limit,
      }),
      db.agentTask.count({ where: { ...scopedWhere, status: 'pending' } }),
      db.agentTask.count({ where: { ...scopedWhere, status: 'running' } }),
      db.agentTask.count({ where: { ...scopedWhere, status: 'completed' } }),
      db.agentTask.count({ where: { ...scopedWhere, status: 'failed' } }),
      db.agentTask.count({ where: { ...scopedWhere, retryCount: { gt: 0 } } }),
    ]);

    return NextResponse.json({
      tasks,
      counts: {
        pending,
        running,
        completed,
        failed,
        retried,
      },
    });
  } catch (error) {
    console.error('Error fetching agent tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent tasks' },
      { status: 500 }
    );
  }
}
