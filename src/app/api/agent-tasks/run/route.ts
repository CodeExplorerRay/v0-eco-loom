import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { runPendingAgentTasks } from '@/lib/server/agent-tasks';

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, 'heavyWrite');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const requestedLimit = Number((body as { limit?: number }).limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(50, Math.trunc(requestedLimit)))
      : 25;

    const result = await runPendingAgentTasks({
      limit,
      actor: auth.session,
      triggerSource: 'manual',
      companyId: auth.session.companyId,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error running agent tasks:', error);
    return NextResponse.json(
      {
        error: 'Failed to run agent tasks',
      },
      { status: 500 }
    );
  }
}
