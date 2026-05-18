import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { AgentTaskTimelineItem } from '@/lib/types';
import { requireApiSession } from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { rescheduleAgentTask, retryFailedAgentTask } from '@/lib/server/agent-tasks';

function parseAuditTaskAction(details?: string | null) {
  if (!details) {
    return null;
  }

  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return typeof parsed.taskAction === 'string' ? parsed.taskAction : null;
  } catch {
    return null;
  }
}

function toTimelineStatus(details?: string | null) {
  const taskAction = parseAuditTaskAction(details);
  if (taskAction === 'retry') return 'pending' as const;
  if (taskAction === 'reschedule') return 'info' as const;
  return 'info' as const;
}

function describeAuditTitle(details?: string | null) {
  const taskAction = parseAuditTaskAction(details);

  if (taskAction === 'retry') {
    return 'Retry queued';
  }

  if (taskAction === 'reschedule') {
    return 'Task rescheduled';
  }

  return 'Task event';
}

function describeAuditEvent(details?: string | null, actorLabel?: string | null) {
  const actorPrefix = actorLabel ? `${actorLabel} ` : 'An administrator ';
  const taskAction = parseAuditTaskAction(details);

  if (taskAction === 'retry') {
    return `${actorPrefix}moved this task back to the pending queue.`;
  }

  if (taskAction === 'reschedule') {
    if (details) {
      try {
        const parsed = JSON.parse(details) as Record<string, unknown>;
        const scheduledAt =
          typeof parsed.scheduledAt === 'string'
            ? new Date(parsed.scheduledAt).toLocaleString()
            : null;
        return scheduledAt
          ? `${actorPrefix}rescheduled this task for ${scheduledAt}.`
          : `${actorPrefix}rescheduled this task.`;
      } catch {
        // fall through
      }
    }
    return `${actorPrefix}rescheduled this task.`;
  }

  return `${actorPrefix}updated this task.`;
}

function formatTaskType(taskType: string) {
  return taskType
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTriggerSource(triggerSource?: string | null) {
  if (triggerSource === 'cron') {
    return 'scheduled cron';
  }

  if (triggerSource === 'notion_import') {
    return 'Notion import';
  }

  if (triggerSource === 'manual') {
    return 'manual run';
  }

  return 'automation queue';
}

function parseResultSummary(result?: string | null) {
  if (!result) {
    return null;
  }

  try {
    const parsed = JSON.parse(result) as Record<string, unknown>;
    if (typeof parsed.summary === 'string' && parsed.summary.trim().length > 0) {
      return parsed.summary.trim();
    }
  } catch {
    // fall through
  }

  const trimmed = result.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getAttemptDescription(attempt: {
  status: string;
  triggerSource?: string | null;
  result?: string | null;
  errorMessage?: string | null;
}) {
  const sourceLabel = formatTriggerSource(attempt.triggerSource);
  const prefix = `Triggered from ${sourceLabel}.`;
  const resultSummary = parseResultSummary(attempt.result);

  if (attempt.status === 'completed') {
    return resultSummary ? `${prefix} ${resultSummary}` : `${prefix} Task execution completed successfully.`;
  }

  if (attempt.status === 'failed') {
    return attempt.errorMessage
      ? `${prefix} ${attempt.errorMessage}`
      : `${prefix} Task execution failed.`;
  }

  if (attempt.status === 'running') {
    return `${prefix} Task execution is currently in progress.`;
  }

  return prefix;
}

function buildQueuedDescription(task: {
  taskType: string;
  createdAt: Date;
  scheduledAt: Date;
}) {
  const taskLabel = formatTaskType(task.taskType);
  const queuedForLater =
    task.scheduledAt.getTime() - task.createdAt.getTime() > 5_000;

  return queuedForLater
    ? `${taskLabel} was added to the automation queue and scheduled for ${task.scheduledAt.toLocaleString()}.`
    : `${taskLabel} was added to the automation queue and is ready for the next available run.`;
}

function getLatestTaskStateDescription(task: {
  status: string;
  retryCount: number;
  scheduledAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  errorMessage?: string | null;
  result?: string | null;
}) {
  if (task.status === 'pending' && task.retryCount > 0) {
    return {
      title: 'Waiting for retry window',
      description: `The task is back in the queue after ${task.retryCount} failed ${task.retryCount === 1 ? 'attempt' : 'attempts'} and is scheduled to run again at ${task.scheduledAt.toLocaleString()}.`,
      status: 'pending' as const,
      occurredAt: task.updatedAt.toISOString(),
    };
  }

  if (task.status === 'failed') {
    return {
      title: 'Task marked failed',
      description: task.errorMessage
        ? `The automation queue stopped retrying this task. Latest error: ${task.errorMessage}`
        : 'The automation queue stopped retrying this task after the latest failure.',
      status: 'failed' as const,
      occurredAt: (task.completedAt ?? task.updatedAt).toISOString(),
    };
  }

  return null;
}

function taskBelongsToCompany(task: { payload?: string | null }, companyId: string) {
  if (!task.payload) {
    return false;
  }

  try {
    const parsed = JSON.parse(task.payload) as Record<string, unknown>;
    return parsed.companyId === companyId;
  } catch {
    return task.payload.includes(`"companyId":"${companyId}"`);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const task = await db.agentTask.findUnique({
      where: { id },
      include: {
        attempts: {
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    if (!task || !taskBelongsToCompany(task, auth.session.companyId)) {
      return NextResponse.json({ error: 'Agent task not found' }, { status: 404 });
    }

    const auditLogs = await db.auditLog.findMany({
      where: {
        entityType: 'agent_task',
        entityId: id,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    const timeline: AgentTaskTimelineItem[] = [
      {
        id: `queue-${task.id}`,
        type: 'event',
        title: 'Task queued',
        description: buildQueuedDescription(task),
        status: 'pending',
        occurredAt: task.createdAt.toISOString(),
      },
      ...task.attempts.map((attempt) => ({
        id: `attempt-${attempt.id}`,
        type: 'attempt' as const,
        title: `Attempt ${attempt.attemptNumber}`,
        description: getAttemptDescription(attempt),
        status: attempt.status as 'pending' | 'running' | 'completed' | 'failed',
        occurredAt: (attempt.completedAt ?? attempt.startedAt ?? attempt.updatedAt).toISOString(),
      })),
      ...auditLogs.map((log) => ({
        id: `event-${log.id}`,
        type: 'event' as const,
        title: describeAuditTitle(log.details),
        description: describeAuditEvent(log.details, log.user?.name || log.user?.email || null),
        status: toTimelineStatus(log.details),
        occurredAt: log.createdAt.toISOString(),
      })),
    ];

    const latestTaskState = getLatestTaskStateDescription(task);
    if (latestTaskState) {
      timeline.push({
        id: `state-${task.id}-${latestTaskState.status}`,
        type: 'event',
        ...latestTaskState,
      });
    }

    timeline.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return NextResponse.json({
      task,
      attempts: task.attempts,
      timeline,
    });
  } catch (error) {
    console.error('Error fetching agent task history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent task history' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await enforceRateLimit(request, 'heavyWrite');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'retry') {
      const existingTask = await db.agentTask.findUnique({
        where: { id },
        select: { id: true, payload: true },
      });
      if (!existingTask || !taskBelongsToCompany(existingTask, auth.session.companyId)) {
        return NextResponse.json({ error: 'Agent task not found' }, { status: 404 });
      }

      const task = await retryFailedAgentTask(id, auth.session);
      return NextResponse.json({ success: true, task });
    }

    if (action === 'reschedule') {
      const existingTask = await db.agentTask.findUnique({
        where: { id },
        select: { id: true, payload: true },
      });
      if (!existingTask || !taskBelongsToCompany(existingTask, auth.session.companyId)) {
        return NextResponse.json({ error: 'Agent task not found' }, { status: 404 });
      }

      const scheduledAtRaw = typeof body.scheduledAt === 'string' ? body.scheduledAt : '';
      const scheduledAt = new Date(scheduledAtRaw);

      if (!scheduledAtRaw || Number.isNaN(scheduledAt.getTime())) {
        return NextResponse.json(
          { error: 'A valid scheduledAt value is required to reschedule a task' },
          { status: 400 }
        );
      }

      const task = await rescheduleAgentTask(id, scheduledAt, auth.session);
      return NextResponse.json({ success: true, task });
    }

    return NextResponse.json(
      { error: 'Unsupported agent task action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating agent task:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update agent task',
      },
      { status: 500 }
    );
  }
}
