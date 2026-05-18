import { NextRequest, NextResponse } from 'next/server';
import { runPendingAgentTasks } from '@/lib/server/agent-tasks';
import { getAuthorizedCompanyId } from '@/lib/server/auth';
import {
  getCronAuthorizationResult,
  releaseCronExecutionLock,
  tryAcquireCronExecutionLock,
} from '@/lib/server/cron';
import { getCompanyNotionConfig, hasAnyMappedNotionDatabase } from '@/lib/server/notion-config';
import {
  buildNotionSyncErrorResponse,
  syncFromNotionWorkspace,
} from '@/app/api/notion/sync-from/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

function clampRequestedLimit(value: number): number {
  return Math.max(1, Math.min(50, Math.trunc(value)));
}

function getDefaultCronLimit(): number {
  const fromEnv = Number(process.env.AGENT_TASKS_CRON_LIMIT);
  return Number.isFinite(fromEnv) ? clampRequestedLimit(fromEnv) : 25;
}

function getRequestedLimit(request: NextRequest): number {
  const fromQuery = Number(request.nextUrl.searchParams.get('limit'));
  return Number.isFinite(fromQuery) ? clampRequestedLimit(fromQuery) : getDefaultCronLimit();
}

function getCronLockName(companyId: string) {
  return `agent-tasks:${companyId}`;
}

async function handleCronRun(request: NextRequest) {
  const authResult = getCronAuthorizationResult(request);
  if (!authResult.authorized) {
    console.warn(authResult.logMessage);
    return NextResponse.json(
      { error: authResult.publicError },
      { status: authResult.status }
    );
  }

  const companyId = getAuthorizedCompanyId();
  const lockName = getCronLockName(companyId);
  const acquiredLock = await tryAcquireCronExecutionLock(lockName);
  if (!acquiredLock) {
    return NextResponse.json(
      {
        success: true,
        trigger: 'cron',
        skipped: true,
        message: 'Another cron run is already processing this workspace.',
        companyId,
      },
      { status: 202 }
    );
  }

  try {
    const requestedLimit = getRequestedLimit(request);
    const notionConfig = await getCompanyNotionConfig(companyId, {
      adoptLegacy: true,
    });

    let notionImport: Record<string, unknown> = {
      attempted: false,
      skipped: true,
      reason: 'Notion MCP is not configured for this workspace.',
    };

    if (notionConfig?.syncEnabled && notionConfig.apiKey && hasAnyMappedNotionDatabase(notionConfig)) {
      try {
        const importResult = await syncFromNotionWorkspace({
          companyId,
          actor: null,
          triggerSource: 'cron',
          processFollowUps: false,
        });

        notionImport = {
          attempted: true,
          skipped: false,
          syncedItems: importResult.syncedItems,
          skippedItems: importResult.skippedItems,
          queuedTasks: importResult.queuedTasks,
          duration: importResult.duration,
          message: importResult.message,
          errors: importResult.errors,
        };
      } catch (error) {
        const importError = buildNotionSyncErrorResponse(error);
        notionImport = {
          attempted: true,
          skipped: false,
          success: false,
          ...importError.body,
        };
        console.error('Error importing Notion changes during scheduled cron run:', error);
      }
    } else if (notionConfig && !notionConfig.syncEnabled) {
      notionImport = {
        attempted: false,
        skipped: true,
        reason: 'Auto Sync is disabled for this workspace, so cron only drained the agent queue.',
      };
    } else if (notionConfig && !hasAnyMappedNotionDatabase(notionConfig)) {
      notionImport = {
        attempted: false,
        skipped: true,
        reason: 'No Notion databases are mapped yet, so cron only drained the agent queue.',
      };
    }

    const result = await runPendingAgentTasks({
      limit: requestedLimit,
      actor: null,
      triggerSource: 'cron',
      companyId,
    });

    return NextResponse.json({
      success: true,
      ...result,
      agentRun: result,
      notionImport,
      trigger: 'cron',
      limit: requestedLimit,
      companyId,
    });
  } catch (error) {
    console.error('Error running scheduled agent tasks:', error);
    return NextResponse.json(
      { error: 'Failed to run scheduled agent tasks' },
      { status: 500 }
    );
  } finally {
    await releaseCronExecutionLock(lockName);
  }
}

export async function GET(request: NextRequest) {
  return handleCronRun(request);
}

export async function POST(request: NextRequest) {
  return handleCronRun(request);
}
