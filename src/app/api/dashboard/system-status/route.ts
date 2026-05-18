import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DashboardSystemStatus, DashboardSystemStatusItem } from '@/lib/types';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';
import {
  countStoredIngestJobs,
  getLatestStoredIngestJob,
} from '@/lib/server/ingest-job-store';
import {
  countMappedCoreNotionDatabases,
  countMappedNotionDatabases,
  getCompanyNotionConfig,
} from '@/lib/server/notion-config';

export const dynamic = 'force-dynamic';

function buildDocumentIntakeStatus(input: {
  isAdminView: boolean;
  totalJobs: number;
  failedJobs: number;
  latestJobUpdatedAt?: Date | null;
}): DashboardSystemStatusItem {
  const updatedAt = input.latestJobUpdatedAt?.toISOString() ?? null;

  if (input.failedJobs > 0) {
    return {
      key: 'document_intake',
      label: 'Document Intake',
      statusLabel: 'Needs Attention',
      tone: 'attention',
      description: `${input.failedJobs} ingest job${input.failedJobs === 1 ? '' : 's'} failed validation or import and need admin review.`,
      meta: 'Evidence storage supports PDF, PNG, JPG. Bulk ledger import supports CSV.',
      updatedAt,
    };
  }

  if (input.totalJobs > 0) {
    return {
      key: 'document_intake',
      label: 'Document Intake',
      statusLabel: input.isAdminView ? 'Ready' : 'Admin Managed',
      tone: input.isAdminView ? 'healthy' : 'info',
      description: input.isAdminView
        ? 'Evidence uploads are stored with audit history, and CSV files are validated against the approved factor library before import.'
        : 'Admins can store evidence files and run validated CSV imports. Standard users can continue to add entries manually.',
      meta: `${input.totalJobs} ingest job${input.totalJobs === 1 ? '' : 's'} recorded in this workspace.`,
      updatedAt,
    };
  }

  return {
    key: 'document_intake',
    label: 'Document Intake',
    statusLabel: input.isAdminView ? 'Ready' : 'Admin Managed',
    tone: input.isAdminView ? 'healthy' : 'info',
    description: input.isAdminView
      ? 'Evidence uploads and CSV imports are available. Files are stored, audit logged, and CSV rows are validated server-side.'
      : 'Admins can store evidence and run validated CSV imports, while standard users continue to add ledger activity manually.',
    meta: 'Supported formats: PDF, PNG, JPG for evidence, plus CSV for bulk ledger import.',
    updatedAt,
  };
}

function buildCalculationLibraryStatus(input: {
  factorCount: number;
  latestFactorYear?: number | null;
  updatedAt?: Date | null;
}): DashboardSystemStatusItem {
  if (input.factorCount <= 0) {
    return {
      key: 'calculation_library',
      label: 'Calculation Library',
      statusLabel: 'Needs Setup',
      tone: 'attention',
      description:
        'No approved emission factors were found, so server-side calculations are not fully ready.',
      meta: 'Load approved factors before entering ledger activity.',
    };
  }

  return {
    key: 'calculation_library',
    label: 'Calculation Library',
    statusLabel: 'Ready',
    tone: 'healthy',
    description: `${input.factorCount} approved emission factors are available for server-side calculations.`,
    meta: input.latestFactorYear
      ? `Latest published factor year: ${input.latestFactorYear}`
      : 'Approved factor library loaded.',
    updatedAt: input.updatedAt?.toISOString() ?? null,
  };
}

function buildNotionStatus(input: {
  apiKey?: string | null;
  syncEnabled?: boolean;
  coreMappedDatabaseCount: number;
  mappedDatabaseCount: number;
  workspaceName?: string | null;
  lastSyncAt?: Date | null;
  updatedAt?: Date | null;
}): DashboardSystemStatusItem {
  if (!input.apiKey) {
    return {
      key: 'notion_workspace',
      label: 'Notion Workspace',
      statusLabel: 'Not Configured',
      tone: 'disabled',
      description: 'The Notion integration has not been configured for this workspace yet.',
      meta: 'Add an API key and database mappings before using sync features.',
    };
  }

  const workspaceLabel = input.workspaceName?.trim() || 'Notion workspace';
  const updatedAt = input.lastSyncAt?.toISOString() ?? input.updatedAt?.toISOString() ?? null;

  if (!input.syncEnabled) {
    return {
      key: 'notion_workspace',
      label: 'Notion Workspace',
      statusLabel: 'Paused',
      tone: 'disabled',
      description: `${workspaceLabel} is configured, but sync is currently paused.`,
      meta: `${input.mappedDatabaseCount} destinations mapped`,
      updatedAt,
    };
  }

  if (input.coreMappedDatabaseCount < 5) {
    return {
      key: 'notion_workspace',
      label: 'Notion Workspace',
      statusLabel: 'Partial Setup',
      tone: 'attention',
      description: `${workspaceLabel} is connected, but some database mappings are still missing.`,
      meta: `${input.mappedDatabaseCount} destinations mapped`,
      updatedAt,
    };
  }

  return {
    key: 'notion_workspace',
    label: 'Notion Workspace',
    statusLabel: 'Connected',
    tone: 'healthy',
    description: `${workspaceLabel} is connected and ready for sync workflows.`,
    meta: 'All core workspace databases are mapped.',
    updatedAt,
  };
}

function buildAutomationStatus(input: {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  latestAttemptUpdatedAt?: Date | null;
  latestAttemptTriggerSource?: string | null;
  latestTaskUpdatedAt?: Date | null;
}): DashboardSystemStatusItem {
  const updatedAt =
    input.latestAttemptUpdatedAt?.toISOString() ??
    input.latestTaskUpdatedAt?.toISOString() ??
    null;
  const latestAttemptSummary =
    input.latestAttemptUpdatedAt && input.latestAttemptTriggerSource
      ? `Last run via ${formatAutomationTriggerSource(input.latestAttemptTriggerSource)}.`
      : input.latestAttemptUpdatedAt
        ? 'Recent automation history is recorded for this workspace.'
        : null;

  if (input.failed > 0) {
    return {
      key: 'automation_queue',
      label: 'Automation Queue',
      statusLabel: 'Needs Attention',
      tone: 'attention',
      description: `${input.failed} failed agent task${input.failed === 1 ? '' : 's'} need review before the queue is fully healthy.`,
      meta: [`${input.pending} pending • ${input.running} running • ${input.completed} completed`, latestAttemptSummary]
        .filter(Boolean)
        .join(' • '),
      updatedAt,
    };
  }

  if (input.running > 0) {
    return {
      key: 'automation_queue',
      label: 'Automation Queue',
      statusLabel: 'Running',
      tone: 'healthy',
      description: `${input.running} agent task${input.running === 1 ? '' : 's'} currently running in the workspace queue.`,
      meta: [`${input.pending} pending • ${input.completed} completed`, latestAttemptSummary]
        .filter(Boolean)
        .join(' • '),
      updatedAt,
    };
  }

  if (input.pending > 0) {
    return {
      key: 'automation_queue',
      label: 'Automation Queue',
      statusLabel: 'Scheduled',
      tone: 'info',
      description: `${input.pending} queued agent task${input.pending === 1 ? '' : 's'} waiting for the next run window.`,
      meta: [
        input.completed > 0
          ? `${input.completed} completed task runs already recorded.`
          : 'No task failures recorded.',
        latestAttemptSummary,
      ]
        .filter(Boolean)
        .join(' • '),
      updatedAt,
    };
  }

  if (input.completed > 0) {
    return {
      key: 'automation_queue',
      label: 'Automation Queue',
      statusLabel: 'Healthy',
      tone: 'healthy',
      description: 'Recent agent tasks completed successfully and the queue is currently clear.',
      meta: [`${input.completed} completed task runs recorded.`, latestAttemptSummary]
        .filter(Boolean)
        .join(' • '),
      updatedAt,
    };
  }

  return {
    key: 'automation_queue',
    label: 'Automation Queue',
    statusLabel: 'Idle',
    tone: 'disabled',
    description: 'No queued or completed agent tasks were found for this workspace yet.',
    meta: 'Run the queue manually or trigger the cron route to start automation history.',
  };
}

function formatAutomationTriggerSource(triggerSource?: string | null) {
  if (triggerSource === 'cron') {
    return 'scheduled cron';
  }

  if (triggerSource === 'notion_import') {
    return 'Notion import follow-up';
  }

  if (triggerSource === 'manual') {
    return 'manual run';
  }

  return 'automation queue';
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const companyId = request.nextUrl.searchParams.get('companyId');
  const companyError = assertCompanyAccess(auth.session, companyId);
  if (companyError) {
    return companyError;
  }

  try {
    const agentTaskWhere = {
      payload: {
        contains: `"companyId":"${companyId}"`,
      },
    } as const;

    const [
      factorCount,
      latestFactor,
      notionConfig,
      ingestJobCount,
      failedIngestJobCount,
      latestIngestJob,
      pendingTaskCount,
      runningTaskCount,
      completedTaskCount,
      failedTaskCount,
      latestAgentTask,
      latestAgentAttempt,
    ] = await Promise.all([
      db.emissionFactor.count(),
      db.emissionFactor.findFirst({
        select: {
          year: true,
          updatedAt: true,
        },
        orderBy: [{ year: 'desc' }, { updatedAt: 'desc' }],
      }),
      getCompanyNotionConfig(companyId!, {
        adoptLegacy: true,
      }),
      countStoredIngestJobs({
        companyId: companyId!,
      }),
      countStoredIngestJobs({
        companyId: companyId!,
        status: 'failed',
      }),
      getLatestStoredIngestJob({
        companyId: companyId!,
      }),
      db.agentTask.count({
        where: {
          ...agentTaskWhere,
          status: 'pending',
        },
      }),
      db.agentTask.count({
        where: {
          ...agentTaskWhere,
          status: 'running',
        },
      }),
      db.agentTask.count({
        where: {
          ...agentTaskWhere,
          status: 'completed',
        },
      }),
      db.agentTask.count({
        where: {
          ...agentTaskWhere,
          status: 'failed',
        },
      }),
      db.agentTask.findFirst({
        where: agentTaskWhere,
        select: {
          updatedAt: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { scheduledAt: 'desc' }],
      }),
      db.agentTaskAttempt.findFirst({
        where: {
          task: agentTaskWhere,
        },
        select: {
          status: true,
          triggerSource: true,
          completedAt: true,
          updatedAt: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
      }),
    ]);

    const notionMappedDatabaseCount = notionConfig
      ? countMappedNotionDatabases(notionConfig)
      : 0;
    const notionCoreMappedDatabaseCount = notionConfig
      ? countMappedCoreNotionDatabases(notionConfig)
      : 0;

    const items: DashboardSystemStatusItem[] = [
      buildDocumentIntakeStatus({
        isAdminView: auth.session.role === 'admin',
        totalJobs: ingestJobCount,
        failedJobs: failedIngestJobCount,
        latestJobUpdatedAt: latestIngestJob?.updatedAt ?? null,
      }),
      buildCalculationLibraryStatus({
        factorCount,
        latestFactorYear: latestFactor?.year ?? null,
        updatedAt: latestFactor?.updatedAt ?? null,
      }),
      buildNotionStatus({
        apiKey: notionConfig?.apiKey ?? null,
        syncEnabled: notionConfig?.syncEnabled,
        coreMappedDatabaseCount: notionCoreMappedDatabaseCount,
        mappedDatabaseCount: notionMappedDatabaseCount,
        workspaceName: notionConfig?.workspaceName ?? null,
        lastSyncAt: notionConfig?.lastSyncAt ?? null,
        updatedAt: notionConfig?.updatedAt ?? null,
      }),
      buildAutomationStatus({
        pending: pendingTaskCount,
        running: runningTaskCount,
        completed: completedTaskCount,
        failed: failedTaskCount,
        latestAttemptUpdatedAt:
          latestAgentAttempt?.completedAt ?? latestAgentAttempt?.updatedAt ?? null,
        latestAttemptTriggerSource: latestAgentAttempt?.triggerSource ?? null,
        latestTaskUpdatedAt: latestAgentTask?.updatedAt ?? null,
      }),
    ];

    const attentionCount = items.filter((item) => item.tone === 'attention').length;
    const disabledCount = items.filter((item) => item.tone === 'disabled').length;

    const summary =
      attentionCount > 0
        ? `${attentionCount} workspace service${attentionCount === 1 ? '' : 's'} need attention before the platform is fully ready.`
        : disabledCount > 0
          ? `${disabledCount} workspace service${disabledCount === 1 ? '' : 's'} are not active yet, but no blocking issues were detected.`
          : 'Workspace services are ready for calculation, sync, and automation checks.';

    const payload: DashboardSystemStatus = {
      checkedAt: new Date().toISOString(),
      summary,
      items,
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard system status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system status' },
      { status: 500 }
    );
  }
}
