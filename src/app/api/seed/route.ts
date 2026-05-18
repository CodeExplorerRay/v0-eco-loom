import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/server/audit';
import { ensureBootstrapUsers, requireApiSession } from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { countDemoWorkspaceData, seedDemoWorkspace } from '@/lib/demo-workspace-seed';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, 'seed');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const clearExisting = body.clearExisting !== false;
    const counts = await countDemoWorkspaceData(db);
    const hasSeedData =
      counts.departments +
        counts.ledgerEntries +
        counts.goals +
        counts.reports >
      0;

    if (hasSeedData && !clearExisting) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Sample data already exists. Replace the current sample data instead of generating duplicates.',
          code: 'SEED_DATA_EXISTS',
          counts,
        },
        { status: 409 }
      );
    }

    await ensureBootstrapUsers();
    const summary = await seedDemoWorkspace(db, { clearExisting });

    await createAuditLog(auth.session, {
      action: 'seed',
      entityType: 'database',
      entityId: 'demo-workspace',
      details: JSON.stringify({
        actor: auth.session.userEmail,
        clearExisting,
        ...summary,
      }),
    });

    return NextResponse.json({
      success: true,
      message:
        clearExisting && hasSeedData
          ? 'Existing sample data replaced successfully!'
          : 'Database seeded successfully!',
      summary,
    });
  } catch (error) {
    console.error('[Seed] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to seed database',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const counts = await countDemoWorkspaceData(db);
    const hasData =
      counts.departments +
        counts.ledgerEntries +
        counts.goals +
        counts.reports >
      0;

    return NextResponse.json({
      hasData,
      counts,
    });
  } catch (error) {
    console.error('[Seed] Error checking data:', error);
    return NextResponse.json({ error: 'Failed to check data' }, { status: 500 });
  }
}
