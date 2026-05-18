import { db } from '@/lib/db';
import type { ApiSession } from '@/lib/server/auth';
import { buildTransactionDateRange, getPreviousReportingPeriod } from '@/lib/reports/reporting-period';
import { createAuditLog } from '@/lib/server/audit';
import { recalculateGoalProgress } from '@/lib/sync-service';
import { formatCo2e } from '@/lib/utils';

type AgentTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

type ClassifyLedgerEntryPayload = {
  companyId: string;
  entryId: string;
};

type RecalculateGoalProgressPayload = {
  companyId: string;
  trigger: 'notion_import' | 'manual';
};

type DraftMonthlyReportPayload = {
  companyId: string;
  reportingPeriod: string;
};

type AgentTaskPayload =
  | { taskType: 'classify_ledger_entry'; payload: ClassifyLedgerEntryPayload }
  | { taskType: 'recalculate_goal_progress'; payload: RecalculateGoalProgressPayload }
  | { taskType: 'draft_monthly_report'; payload: DraftMonthlyReportPayload };

type EnqueueTaskInput = AgentTaskPayload & {
  scheduledAt?: Date;
  maxRetries?: number;
};

type TaskRunSummary = {
  total: number;
  completed: number;
  failed: number;
  results: Array<{
    id: string;
    taskType: string;
    status: AgentTaskStatus;
    result?: string;
    error?: string;
  }>;
};

type RunnableAgentTask = {
  id: string;
  taskType: string;
  payload: string | null;
  retryCount: number;
  maxRetries: number;
  startedAt: Date | null;
  scheduledAt: Date;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

async function findExistingQueuedTask(taskType: string, payload: string) {
  const candidates = await db.agentTask.findMany({
    where: {
      taskType,
      status: {
        in: ['pending', 'running'],
      },
    },
    select: {
      id: true,
      payload: true,
    },
  });

  return candidates.find((candidate) => candidate.payload === payload) || null;
}

export async function enqueueAgentTask(input: EnqueueTaskInput) {
  const payloadString = stableStringify(input.payload);
  const existing = await findExistingQueuedTask(input.taskType, payloadString);

  if (existing) {
    return { taskId: existing.id, created: false };
  }

  const task = await db.agentTask.create({
    data: {
      taskType: input.taskType,
      status: 'pending',
      scheduledAt: input.scheduledAt || new Date(),
      payload: payloadString,
      maxRetries: input.maxRetries ?? 3,
    },
  });

  return { taskId: task.id, created: true };
}

export async function enqueueNotionImportFollowUps(input: {
  companyId: string;
  importedLedgerEntryIds: string[];
  importedGoalCount: number;
  reportingPeriods: string[];
}) {
  let created = 0;

  for (const entryId of input.importedLedgerEntryIds) {
    const result = await enqueueAgentTask({
      taskType: 'classify_ledger_entry',
      payload: {
        companyId: input.companyId,
        entryId,
      },
    });
    if (result.created) {
      created++;
    }
  }

  if (input.importedLedgerEntryIds.length > 0 || input.importedGoalCount > 0) {
    const result = await enqueueAgentTask({
      taskType: 'recalculate_goal_progress',
      payload: {
        companyId: input.companyId,
        trigger: 'notion_import',
      },
    });
    if (result.created) {
      created++;
    }
  }

  for (const reportingPeriod of new Set(input.reportingPeriods)) {
    if (!/^\d{4}-\d{2}$/.test(reportingPeriod)) {
      continue;
    }

    const result = await enqueueAgentTask({
      taskType: 'draft_monthly_report',
      payload: {
        companyId: input.companyId,
        reportingPeriod,
      },
    });
    if (result.created) {
      created++;
    }
  }

  return { created };
}

function safeParsePayload<T>(payload: string | null): T | null {
  if (!payload) return null;

  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

async function processClassifyLedgerEntry(taskId: string, payload: ClassifyLedgerEntryPayload, actor: ApiSession | null) {
  const entry = await db.carbonLedgerEntry.findUnique({
    where: { id: payload.entryId },
  });

  if (!entry) {
    return {
      taskId,
      summary: 'Ledger entry no longer exists.',
    };
  }

  const classification = {
    mode: 'rule_based',
    origin: 'agent_task',
    sourceType: entry.sourceType,
    category: entry.category,
    confidence: 0.64,
    updatedAt: new Date().toISOString(),
  };

  await db.carbonLedgerEntry.update({
    where: { id: entry.id },
    data: {
      aiClassification: JSON.stringify(classification),
    },
  });

  await createAuditLog(actor, {
    action: 'calculate',
    entityType: 'carbon_entry',
    entityId: entry.id,
    details: JSON.stringify({
      companyId: payload.companyId,
      taskType: 'classify_ledger_entry',
      mode: classification.mode,
      confidence: classification.confidence,
    }),
  });

  return {
    taskId,
    summary: 'Ledger entry classification refreshed.',
  };
}

async function processRecalculateGoalProgress(
  taskId: string,
  payload: RecalculateGoalProgressPayload,
  actor: ApiSession | null
) {
  const result = await recalculateGoalProgress(payload.companyId);

  if (!result.success || !result.updates) {
    throw new Error(result.error || 'Goal progress recalculation failed');
  }

  const updatedGoalCount = result.updates.length;

  await createAuditLog(actor, {
    action: 'calculate',
    entityType: 'goal',
    entityId: payload.companyId,
    details: JSON.stringify({
      companyId: payload.companyId,
      taskType: 'recalculate_goal_progress',
      trigger: payload.trigger,
      updatedGoals: updatedGoalCount,
    }),
  });

  return {
    taskId,
    summary: `Recalculated ${updatedGoalCount} goals.`,
    updatedGoals: updatedGoalCount,
  };
}

async function processDraftMonthlyReport(
  taskId: string,
  payload: DraftMonthlyReportPayload,
  actor: ApiSession | null
) {
  const existingReport = await db.report.findFirst({
    where: {
      companyId: payload.companyId,
      reportingPeriod: payload.reportingPeriod,
      reportType: 'monthly_summary',
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  if (existingReport) {
    return {
      taskId,
      summary: 'Monthly report already exists for this period.',
      reportId: existingReport.id,
      reused: true,
    };
  }

  const entries = await db.carbonLedgerEntry.findMany({
    where: {
      companyId: payload.companyId,
      transactionDate: buildTransactionDateRange(payload.reportingPeriod),
    },
  });

  if (entries.length === 0) {
    return {
      taskId,
      summary: 'Skipped report draft because there are no ledger entries for this period.',
      skipped: true,
    };
  }

  const totalEmissions = entries.reduce((sum, entry) => sum + entry.co2Equivalent, 0);
  const previousPeriod = getPreviousReportingPeriod(payload.reportingPeriod);
  const previousEntries = previousPeriod
    ? await db.carbonLedgerEntry.findMany({
        where: {
          companyId: payload.companyId,
          transactionDate: buildTransactionDateRange(previousPeriod),
        },
      })
    : [];
  const previousPeriodEmissions = previousEntries.reduce((sum, entry) => sum + entry.co2Equivalent, 0);
  const verifiedEntries = entries.filter((entry) => entry.verified).length;
  const documentedEntries = entries.filter(
    (entry) => Boolean(entry.sourceDocument?.trim()) || Boolean(entry.documentUrl?.trim())
  ).length;
  const topSource = getTopEmissionSourceLabel(entries);
  const verificationRate = entries.length > 0 ? (verifiedEntries / entries.length) * 100 : 0;
  const evidenceCoverageRate = entries.length > 0 ? (documentedEntries / entries.length) * 100 : 0;

  const summary = buildMonthlyDraftSummary({
    reportingPeriod: payload.reportingPeriod,
    entryCount: entries.length,
    totalEmissions,
    previousPeriod,
    previousPeriodEmissions,
    topSource,
  });
  const recommendations = buildMonthlyDraftInsights({
    reportingPeriod: payload.reportingPeriod,
    totalEmissions,
    previousPeriod,
    previousPeriodEmissions,
    topSource,
    verificationRate,
    evidenceCoverageRate,
    undocumentedEntries: entries.length - documentedEntries,
    unverifiedEntries: entries.length - verifiedEntries,
  });

  const report = await db.report.create({
    data: {
      title: `Monthly Summary - ${payload.reportingPeriod}`,
      reportType: 'monthly_summary',
      reportingPeriod: payload.reportingPeriod,
      summary,
      totalEmissions,
      previousPeriodEmissions,
      recommendations,
      status: 'draft',
      companyId: payload.companyId,
    },
  });

  await createAuditLog(actor, {
    action: 'create',
    entityType: 'report',
    entityId: report.id,
    details: JSON.stringify({
      companyId: payload.companyId,
      taskType: 'draft_monthly_report',
      reportingPeriod: payload.reportingPeriod,
      autoDrafted: true,
    }),
  });

  return {
    taskId,
    summary: 'Monthly report draft created.',
    reportId: report.id,
  };
}

function buildMonthlyDraftSummary(input: {
  reportingPeriod: string;
  entryCount: number;
  totalEmissions: number;
  previousPeriod: string | null;
  previousPeriodEmissions: number;
  topSource: string | null;
}) {
  const overviewParts = [
    `Monthly reporting package for ${input.reportingPeriod} covering ${input.entryCount} ledger entr${input.entryCount === 1 ? 'y' : 'ies'} and ${formatCo2e(input.totalEmissions)}.`,
  ];

  const trendSummary = buildMonthlyTrendSummary(
    input.previousPeriod,
    input.totalEmissions,
    input.previousPeriodEmissions
  );
  if (trendSummary) {
    overviewParts.push(trendSummary);
  }

  if (input.topSource) {
    overviewParts.push(`${input.topSource} was the leading emissions source this month.`);
  }

  return overviewParts.join(' ');
}

function buildMonthlyDraftInsights(input: {
  reportingPeriod: string;
  totalEmissions: number;
  previousPeriod: string | null;
  previousPeriodEmissions: number;
  topSource: string | null;
  verificationRate: number;
  evidenceCoverageRate: number;
  undocumentedEntries: number;
  unverifiedEntries: number;
}) {
  const insightParts: string[] = [];

  if (input.topSource) {
    insightParts.push(`Review ${input.topSource.toLowerCase()} first, because it contributed the largest share of emissions in ${input.reportingPeriod}.`);
  }

  const trendSummary = buildMonthlyTrendSummary(
    input.previousPeriod,
    input.totalEmissions,
    input.previousPeriodEmissions
  );
  if (trendSummary) {
    insightParts.push(trendSummary);
  }

  if (input.unverifiedEntries > 0 || input.verificationRate < 90) {
    insightParts.push(
      `${input.verificationRate.toFixed(1)}% of entries are verified. Clear the remaining ${input.unverifiedEntries} entr${input.unverifiedEntries === 1 ? 'y' : 'ies'} before approval.`
    );
  }

  if (input.undocumentedEntries > 0 || input.evidenceCoverageRate < 90) {
    insightParts.push(
      `${input.evidenceCoverageRate.toFixed(1)}% of entries include source evidence. Attach supporting documents for the remaining ${input.undocumentedEntries} entr${input.undocumentedEntries === 1 ? 'y' : 'ies'} to improve audit readiness.`
    );
  }

  if (insightParts.length === 0) {
    insightParts.push(
      'Data quality checks look strong for this month. Move into reviewer approval and keep the largest source category under watch in the next cycle.'
    );
  }

  return insightParts.join(' ');
}

function buildMonthlyTrendSummary(
  previousPeriod: string | null,
  totalEmissions: number,
  previousPeriodEmissions: number
) {
  if (!previousPeriod) {
    return null;
  }

  if (previousPeriodEmissions <= 0) {
    return `No comparable emissions baseline was available for ${previousPeriod}.`;
  }

  const delta = totalEmissions - previousPeriodEmissions;
  const deltaPercent = Math.abs((delta / previousPeriodEmissions) * 100);
  if (deltaPercent < 3) {
    return `Emissions stayed broadly stable compared with ${previousPeriod}.`;
  }

  return `Emissions ${delta > 0 ? 'rose' : 'fell'} by ${deltaPercent.toFixed(1)}% compared with ${previousPeriod}.`;
}

function getTopEmissionSourceLabel(
  entries: Array<{ sourceType: string; co2Equivalent: number }>
) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.sourceType, (totals.get(entry.sourceType) || 0) + entry.co2Equivalent);
  }

  let topSource: string | null = null;
  let topEmissions = -1;
  for (const [sourceType, emissions] of totals.entries()) {
    if (emissions > topEmissions) {
      topSource = sourceType;
      topEmissions = emissions;
    }
  }

  if (!topSource) {
    return null;
  }

  return topSource
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function executeTask(task: { id: string; taskType: string; payload: string | null }, actor: ApiSession | null) {
  switch (task.taskType) {
    case 'classify_ledger_entry': {
      const payload = safeParsePayload<ClassifyLedgerEntryPayload>(task.payload);
      if (!payload) {
        throw new Error('Invalid classify_ledger_entry payload');
      }
      return processClassifyLedgerEntry(task.id, payload, actor);
    }
    case 'recalculate_goal_progress': {
      const payload = safeParsePayload<RecalculateGoalProgressPayload>(task.payload);
      if (!payload) {
        throw new Error('Invalid recalculate_goal_progress payload');
      }
      return processRecalculateGoalProgress(task.id, payload, actor);
    }
    case 'draft_monthly_report': {
      const payload = safeParsePayload<DraftMonthlyReportPayload>(task.payload);
      if (!payload) {
        throw new Error('Invalid draft_monthly_report payload');
      }
      return processDraftMonthlyReport(task.id, payload, actor);
    }
    default:
      throw new Error(`Unsupported task type: ${task.taskType}`);
  }
}

async function claimPendingAgentTask(taskId: string): Promise<RunnableAgentTask | null> {
  const startedAt = new Date();
  const claim = await db.agentTask.updateMany({
    where: {
      id: taskId,
      status: 'pending',
      scheduledAt: {
        lte: startedAt,
      },
    },
    data: {
      status: 'running',
      startedAt,
      completedAt: null,
      errorMessage: null,
    },
  });

  if (claim.count === 0) {
    return null;
  }

  return db.agentTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      taskType: true,
      payload: true,
      retryCount: true,
      maxRetries: true,
      startedAt: true,
      scheduledAt: true,
    },
  });
}

export async function runPendingAgentTasks(options?: {
  limit?: number;
  actor?: ApiSession | null;
  triggerSource?: 'manual' | 'cron' | 'notion_import';
  companyId?: string;
}): Promise<TaskRunSummary> {
  const taskCandidates = await db.agentTask.findMany({
    where: {
      status: 'pending',
      scheduledAt: {
        lte: new Date(),
      },
      ...(options?.companyId
        ? {
            payload: {
              contains: `"companyId":"${options.companyId}"`,
            },
          }
        : {}),
    },
    orderBy: {
      scheduledAt: 'asc',
    },
    take: options?.limit ?? 25,
    select: {
      id: true,
    },
  });

  const summary: TaskRunSummary = {
    total: 0,
    completed: 0,
    failed: 0,
    results: [],
  };

  for (const candidate of taskCandidates) {
    const task = await claimPendingAgentTask(candidate.id);
    if (!task) {
      continue;
    }

    summary.total++;
    const attemptNumber = task.retryCount + 1;
    const attempt = await db.agentTaskAttempt.create({
      data: {
        taskId: task.id,
        attemptNumber,
        status: 'running',
        triggerSource: options?.triggerSource || 'manual',
      },
    });

    try {
      const result = await executeTask(task, options?.actor ?? null);
      await db.agentTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          result: JSON.stringify(result),
        },
      });
      await db.agentTaskAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          result: JSON.stringify(result),
        },
      });
      summary.completed++;
      summary.results.push({
        id: task.id,
        taskType: task.taskType,
        status: 'completed',
        result: result.summary,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown task error';
      const nextRetryCount = task.retryCount + 1;
      const hasRetriesLeft = nextRetryCount < task.maxRetries;

      await db.agentTask.update({
        where: { id: task.id },
        data: {
          status: hasRetriesLeft ? 'pending' : 'failed',
          retryCount: nextRetryCount,
          startedAt: hasRetriesLeft ? null : task.startedAt,
          scheduledAt: hasRetriesLeft ? new Date(Date.now() + 60_000) : task.scheduledAt,
          completedAt: hasRetriesLeft ? null : new Date(),
          errorMessage: message,
        },
      });
      await db.agentTaskAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: message,
        },
      });

      if (!hasRetriesLeft) {
        summary.failed++;
      }

      summary.results.push({
        id: task.id,
        taskType: task.taskType,
        status: hasRetriesLeft ? 'pending' : 'failed',
        error: message,
      });
    }
  }

  return summary;
}

export async function retryFailedAgentTask(taskId: string, actor: ApiSession | null) {
  const task = await db.agentTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('Agent task not found');
  }

  if (task.status !== 'failed') {
    throw new Error('Only failed tasks can be retried');
  }

  const updatedTask = await db.agentTask.update({
    where: { id: task.id },
    data: {
      status: 'pending',
      scheduledAt: new Date(),
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      result: null,
    },
  });

  await createAuditLog(actor, {
    action: 'update',
    entityType: 'agent_task',
    entityId: updatedTask.id,
    details: JSON.stringify({
      taskAction: 'retry',
      taskType: updatedTask.taskType,
      previousRetryCount: task.retryCount,
    }),
  });

  return updatedTask;
}

export async function rescheduleAgentTask(
  taskId: string,
  scheduledAt: Date,
  actor: ApiSession | null
) {
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error('Invalid schedule time');
  }

  const task = await db.agentTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('Agent task not found');
  }

  if (task.status === 'running') {
    throw new Error('Running tasks cannot be rescheduled');
  }

  if (task.status === 'completed') {
    throw new Error('Completed tasks cannot be rescheduled');
  }

  const data =
    task.status === 'failed'
      ? {
          status: 'pending' as const,
          scheduledAt,
          startedAt: null,
          completedAt: null,
          errorMessage: null,
          result: null,
        }
      : {
          scheduledAt,
        };

  const updatedTask = await db.agentTask.update({
    where: { id: task.id },
    data,
  });

  await createAuditLog(actor, {
    action: 'update',
    entityType: 'agent_task',
    entityId: updatedTask.id,
    details: JSON.stringify({
      taskAction: 'reschedule',
      taskType: updatedTask.taskType,
      scheduledAt: scheduledAt.toISOString(),
      previousStatus: task.status,
    }),
  });

  return updatedTask;
}
