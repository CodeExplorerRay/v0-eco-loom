import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireApiSession } from '@/lib/server/auth';
import type { ApiSession } from '@/lib/server/auth';
import { enqueueNotionImportFollowUps, runPendingAgentTasks } from '@/lib/server/agent-tasks';
import {
  getCompanyNotionConfig,
  getDecryptedNotionApiKey,
  hasAnyMappedNotionDatabase,
  getNotionImportCursor,
  markNotionPullSynced,
} from '@/lib/server/notion-config';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { formatMonthlyReportingPeriod, isValidReportingPeriod } from '@/lib/reports/reporting-period';
import {
  findMatchingLedgerEntry,
  getLedgerDuplicateErrorMessage,
} from '@/lib/server/ledger-duplicates';
import { resolveApprovedLedgerCalculation } from '@/lib/server/ledger-factors';
import type { SourceType } from '@/lib/types';

// Configuration
const SYNC_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  pageSize: 100,
  requestTimeoutMs: 30000,
  incrementalLookbackMs: 60_000,
};

type NotionPage = Record<string, unknown>;
type SyncFromResult = {
  synced: number;
  skipped: number;
  errors: string[];
  importedIds: string[];
  reportingPeriods: string[];
};

type NotionSyncTriggerSource = 'manual' | 'cron';

type SyncFromWorkspaceOptions = {
  companyId: string;
  actor: ApiSession | null;
  triggerSource: NotionSyncTriggerSource;
  processFollowUps?: boolean;
  agentTaskTriggerSource?: 'manual' | 'cron' | 'notion_import';
};

class NotionSyncError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'NotionSyncError';
  }
}

export function buildNotionSyncErrorResponse(error: unknown) {
  if (error instanceof NotionSyncError) {
    return {
      status: error.status,
      body: {
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }

  return {
    status: 500,
    body: {
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      code: 'SYNC_FAILED',
    },
  };
}

// Helper: Sleep function for retries
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Retry wrapper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = SYNC_CONFIG.maxRetries,
  operation: string = 'operation'
): Promise<{ success: boolean; result?: T; error?: string }> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();

      if (
        typeof result === 'object' &&
        result !== null &&
        'success' in result &&
        (result as { success?: boolean }).success === false
      ) {
        const message =
          'error' in result && typeof (result as { error?: unknown }).error === 'string'
            ? ((result as { error?: string }).error || `${operation} failed`)
            : `${operation} failed`;
        throw new Error(message);
      }

      return { success: true, result };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Sync-From] ${operation} failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = SYNC_CONFIG.retryDelayMs * Math.pow(2, attempt - 1);
        console.log(`[Sync-From] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  return { success: false, error: lastError?.message || 'Unknown error' };
}

// Helper: Query Notion database with error handling
async function queryNotionDatabase(
  apiKey: string,
  databaseId: string,
  startCursor?: string,
  editedAfter?: string
): Promise<{ 
  success: boolean; 
  results?: Array<Record<string, unknown>>; 
  nextCursor?: string; 
  error?: string 
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SYNC_CONFIG.requestTimeoutMs);
    
    const body: Record<string, unknown> = {
      page_size: SYNC_CONFIG.pageSize,
      start_cursor: startCursor,
      sorts: [
        {
          timestamp: 'last_edited_time',
          direction: 'ascending',
        },
      ],
    };

    if (editedAfter) {
      body.filter = {
        timestamp: 'last_edited_time',
        last_edited_time: {
          after: editedAfter,
        },
      };
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json() as Record<string, unknown>;
    
    if (!response.ok) {
      const errorCode = data.code as string;
      const errorMessage = data.message as string;
      
      switch (errorCode) {
        case 'unauthorized':
          return { success: false, error: 'Invalid API key' };
        case 'restricted_resource':
          return { success: false, error: 'Integration not shared with database' };
        case 'object_not_found':
          return { success: false, error: 'Database not found' };
        default:
          return { success: false, error: errorMessage || `HTTP ${response.status}` };
      }
    }
    
    return { 
      success: true, 
      results: data.results as Array<Record<string, unknown>>,
      nextCursor: data.next_cursor as string | undefined
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Request timed out' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper: Extract property value from Notion page
function extractProperty(page: Record<string, unknown>, propertyName: string, type: string): unknown {
  const properties = page.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties) return null;
  
  // Try exact match first, then case-insensitive
  let prop = properties[propertyName];
  if (!prop) {
    const key = Object.keys(properties).find(k => k.toLowerCase() === propertyName.toLowerCase());
    if (key) prop = properties[key];
  }
  if (!prop) return null;
  
  switch (type) {
    case 'title':
      return (prop.title as Array<{ text: { content: string } }>)?.[0]?.text?.content || null;
    case 'rich_text':
      return (prop.rich_text as Array<{ text: { content: string } }>)?.[0]?.text?.content || null;
    case 'select':
      return (prop.select as { name: string })?.name || null;
    case 'number':
      return prop.number as number | null;
    case 'date':
      return (prop.date as { start: string })?.start || null;
    case 'checkbox':
      return prop.checkbox as boolean || false;
    default:
      return null;
  }
}

// Helper: Safe parse float
function safeParseFloat(value: unknown, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
}

// Helper: Safe parse int
function safeParseInt(value: unknown, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function extractStringProperty(page: Record<string, unknown>, propertyName: string) {
  return (
    normalizeOptionalString(extractProperty(page, propertyName, 'rich_text')) ||
    normalizeOptionalString(extractProperty(page, propertyName, 'title')) ||
    normalizeOptionalString(extractProperty(page, propertyName, 'select'))
  );
}

function normalizeSourceType(value: unknown): SourceType | null {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  switch (normalized) {
    case 'electricity':
    case 'travel':
    case 'shipping':
    case 'gas':
    case 'waste':
    case 'water':
    case 'other':
      return normalized;
    default:
      return null;
  }
}

function resolveImportedReportingPeriod(rawReportingPeriod: unknown, transactionDate: Date) {
  const normalized = normalizeOptionalString(rawReportingPeriod);
  if (normalized && isValidReportingPeriod(normalized)) {
    return normalized;
  }

  return formatMonthlyReportingPeriod(transactionDate);
}

function getIncrementalEditedAfter(lastSyncAt?: Date | null): string | undefined {
  if (!lastSyncAt) return undefined;

  return new Date(lastSyncAt.getTime() - SYNC_CONFIG.incrementalLookbackMs).toISOString();
}

function getPageLastEditedAt(page: NotionPage): Date | null {
  const value = page.last_edited_time;
  if (typeof value !== 'string') return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPageLastEditor(page: NotionPage): string | null {
  const lastEditedBy = page.last_edited_by as Record<string, unknown> | undefined;
  if (!lastEditedBy) return null;

  if (typeof lastEditedBy.id === 'string' && lastEditedBy.id.length > 0) {
    return lastEditedBy.id;
  }

  if (typeof lastEditedBy.name === 'string' && lastEditedBy.name.length > 0) {
    return lastEditedBy.name;
  }

  return null;
}

function shouldApplyRemoteUpdate(
  remoteEditedAt: Date | null,
  localEditedAt?: Date | null
): boolean {
  if (!remoteEditedAt) return true;
  if (!localEditedAt) return true;

  return remoteEditedAt.getTime() > localEditedAt.getTime();
}

function buildNotionImportMetadata(page: NotionPage, pageId: string) {
  return {
    notionPageId: pageId,
    notionSyncedAt: new Date(),
    notionLastEditedAt: getPageLastEditedAt(page),
    notionLastEditor: getPageLastEditor(page),
    notionSyncStatus: 'imported',
  };
}

export async function syncFromNotionWorkspace(options: SyncFromWorkspaceOptions) {
  const startTime = Date.now();
  console.log(`[Sync-From] Starting ${options.triggerSource} Notion import for company ${options.companyId}...`);

  const storedConfig = await getCompanyNotionConfig(options.companyId, {
    adoptLegacy: true,
  });

  if (!storedConfig) {
    throw new NotionSyncError(
      400,
      'NOT_CONFIGURED',
      'Notion not configured. Please set up your API key first.'
    );
  }

  const { config, apiKey } = await getDecryptedNotionApiKey(storedConfig);
  if (!apiKey) {
    throw new NotionSyncError(
      400,
      'NOT_CONFIGURED',
      'Notion not configured. Please set up your API key first.'
    );
  }

  if (!hasAnyMappedNotionDatabase(config)) {
    throw new NotionSyncError(
      400,
      'NO_DATABASES',
      'No Notion database mappings were found for this workspace. Add at least one mapped database before importing.'
    );
  }

  const editedAfter = getIncrementalEditedAfter(getNotionImportCursor(config));
  let syncedItems = 0;
  let skippedItems = 0;
  const errors: Array<{ entity: string; error: string }> = [];
  const importedLedgerEntryIds: string[] = [];
  const importedReportingPeriods: string[] = [];
  let importedGoalCount = 0;

  const company = await db.company.findUnique({
    where: { id: options.companyId },
  });

  if (!company) {
    throw new NotionSyncError(
      404,
      'COMPANY_NOT_FOUND',
      'The current workspace company record is missing. Repair company settings before running a Notion import.'
    );
  }

  if (config.databaseIdDepts) {
    console.log('[Sync-From] Syncing departments...');
    const deptResult = await syncDepartmentsFromNotion(apiKey, config.databaseIdDepts, company.id, editedAfter);
    syncedItems += deptResult.synced;
    skippedItems += deptResult.skipped;
    if (deptResult.errors.length > 0) {
      errors.push(...deptResult.errors.map((error) => ({ entity: 'department', error })));
    }
  }

  if (config.databaseIdGoals) {
    console.log('[Sync-From] Syncing goals...');
    const goalResult = await syncGoalsFromNotion(apiKey, config.databaseIdGoals, company.id, editedAfter);
    syncedItems += goalResult.synced;
    skippedItems += goalResult.skipped;
    importedGoalCount += goalResult.importedIds.length;
    if (goalResult.errors.length > 0) {
      errors.push(...goalResult.errors.map((error) => ({ entity: 'goal', error })));
    }
  }

  if (config.databaseIdLedger) {
    console.log('[Sync-From] Syncing ledger entries...');
    const ledgerResult = await syncLedgerFromNotion(apiKey, config.databaseIdLedger, company.id, editedAfter);
    syncedItems += ledgerResult.synced;
    skippedItems += ledgerResult.skipped;
    importedLedgerEntryIds.push(...ledgerResult.importedIds);
    importedReportingPeriods.push(...ledgerResult.reportingPeriods);
    if (ledgerResult.errors.length > 0) {
      errors.push(...ledgerResult.errors.map((error) => ({ entity: 'ledger', error })));
    }
  }

  if (config.databaseIdReports) {
    console.log('[Sync-From] Syncing reports...');
    const reportResult = await syncReportsFromNotion(apiKey, config.databaseIdReports, company.id, editedAfter);
    syncedItems += reportResult.synced;
    skippedItems += reportResult.skipped;
    if (reportResult.errors.length > 0) {
      errors.push(...reportResult.errors.map((error) => ({ entity: 'report', error })));
    }
  }

  const queuedTasks = await enqueueNotionImportFollowUps({
    companyId: company.id,
    importedLedgerEntryIds,
    importedGoalCount,
    reportingPeriods: importedReportingPeriods,
  });

  const shouldProcessFollowUps = options.processFollowUps ?? true;
  const agentRun = shouldProcessFollowUps
    ? await runPendingAgentTasks({
        limit: 20,
        actor: options.actor,
        triggerSource: options.agentTaskTriggerSource ?? 'notion_import',
        companyId: company.id,
      })
    : null;

  await markNotionPullSynced(config);

  const duration = Date.now() - startTime;

  await db.auditLog.create({
    data: {
      action: 'sync',
      entityType: 'notion',
      entityId: config.id,
      userId: options.actor?.userId ?? null,
      details: JSON.stringify({
        direction: 'from_notion',
        triggerSource: options.triggerSource,
        syncedItems,
        skippedItems,
        editedAfter,
        queuedTasks: queuedTasks.created,
        processedFollowUps: shouldProcessFollowUps,
        agentRun,
        errors,
        durationMs: duration,
      }),
    },
  });

  console.log(`[Sync-From] Completed in ${duration}ms. Total synced: ${syncedItems}`);

  return {
    success: true,
    syncedItems,
    skippedItems,
    queuedTasks: queuedTasks.created,
    agentRun,
    errors: errors.length > 0 ? errors : undefined,
    duration,
    message: `Successfully imported ${syncedItems} items from Notion`,
  };
}

// POST - Sync data from Notion to Eco-Loom
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
    const result = await syncFromNotionWorkspace({
      companyId: auth.session.companyId,
      actor: auth.session,
      triggerSource: 'manual',
      processFollowUps: true,
      agentTaskTriggerSource: 'notion_import',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Sync-From] Error:', error);
    const response = buildNotionSyncErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

// Sync departments from Notion
async function syncDepartmentsFromNotion(
  apiKey: string, 
  databaseId: string, 
  companyId: string,
  editedAfter?: string
): Promise<SyncFromResult> {
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];
  const importedIds: string[] = [];
  const reportingPeriods: string[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const queryResult = await withRetry(
      () => queryNotionDatabase(apiKey, databaseId, startCursor, editedAfter),
      SYNC_CONFIG.maxRetries,
      'Query departments'
    );

    if (!queryResult.success || !queryResult.result?.results) {
      errors.push(queryResult.error || 'Failed to query departments');
      break;
    }

    for (const page of queryResult.result.results) {
      try {
        const pageId = page.id as string;
        const notionMetadata = buildNotionImportMetadata(page, pageId);
        const name = extractProperty(page, 'Title', 'title') || extractProperty(page, 'Name', 'title') || 'Unnamed';
        const code = extractProperty(page, 'Code', 'rich_text') || 'UNK';
        const budget = extractProperty(page, 'Budget', 'number');

        // Check if department exists by notionPageId
        const existingByPageId = await db.department.findFirst({
          where: { notionPageId: pageId },
        });

        if (existingByPageId) {
          if (!shouldApplyRemoteUpdate(notionMetadata.notionLastEditedAt, existingByPageId.notionLastEditedAt)) {
            skipped++;
            continue;
          }

          // Update existing
          await db.department.update({
            where: { id: existingByPageId.id },
            data: {
              name: String(name),
              code: String(code),
              budget: budget ? safeParseFloat(budget) : null,
              ...notionMetadata,
            },
          });
        } else {
          // Check if exists by code
          const existingByCode = await db.department.findFirst({
            where: { code: String(code), companyId },
          });

          if (existingByCode) {
            if (
              existingByCode.notionPageId &&
              existingByCode.notionPageId !== pageId
            ) {
              errors.push(`Skipped department ${String(code)} because it is already linked to a different Notion page.`);
              continue;
            }

            if (!shouldApplyRemoteUpdate(notionMetadata.notionLastEditedAt, existingByCode.notionLastEditedAt)) {
              skipped++;
              continue;
            }

            // Link to Notion
            await db.department.update({
              where: { id: existingByCode.id },
              data: {
                name: String(name),
                code: String(code),
                budget: budget ? safeParseFloat(budget) : null,
                ...notionMetadata,
              },
            });
          } else {
            // Create new
            await db.department.create({
              data: {
                name: String(name),
                code: String(code),
                budget: budget ? safeParseFloat(budget) : null,
                companyId,
                ...notionMetadata,
              },
            });
          }
        }
        synced++;
        importedIds.push(pageId);
      } catch (error) {
        errors.push(`Failed to sync department: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    hasMore = !!queryResult.result.nextCursor;
    startCursor = queryResult.result.nextCursor;
  }

  return { synced, skipped, errors, importedIds, reportingPeriods };
}

// Sync goals from Notion
async function syncGoalsFromNotion(
  apiKey: string, 
  databaseId: string, 
  companyId: string,
  editedAfter?: string
): Promise<SyncFromResult> {
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];
  const importedIds: string[] = [];
  const reportingPeriods: string[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const queryResult = await withRetry(
      () => queryNotionDatabase(apiKey, databaseId, startCursor, editedAfter),
      SYNC_CONFIG.maxRetries,
      'Query goals'
    );

    if (!queryResult.success || !queryResult.result?.results) {
      errors.push(queryResult.error || 'Failed to query goals');
      break;
    }

    for (const page of queryResult.result.results) {
      try {
        const pageId = page.id as string;
        const notionMetadata = buildNotionImportMetadata(page, pageId);
        const title = extractProperty(page, 'Title', 'title') || extractProperty(page, 'Name', 'title') || 'Untitled Goal';
        const goalType = extractProperty(page, 'Type', 'select') || 'other';
        const status = extractProperty(page, 'Status', 'select') || 'on_track';
        const progress = extractProperty(page, 'Progress', 'number');
        const targetValue = extractProperty(page, 'Target Value', 'number');
        const targetUnit = extractProperty(page, 'Target Unit', 'rich_text') || '%';
        const targetYear = extractProperty(page, 'Target Year', 'number');

        const existingGoal = await db.sustainabilityGoal.findFirst({
          where: { notionPageId: pageId },
        });

        const progressPercent = safeParseFloat(progress, 0);
        const target = safeParseFloat(targetValue, 100);

        if (existingGoal) {
          if (!shouldApplyRemoteUpdate(notionMetadata.notionLastEditedAt, existingGoal.notionLastEditedAt)) {
            skipped++;
            continue;
          }

          await db.sustainabilityGoal.update({
            where: { id: existingGoal.id },
            data: {
              title: String(title),
              goalType: String(goalType),
              status: String(status) as 'on_track' | 'at_risk' | 'achieved' | 'missed',
              progressPercent,
              currentValue: (progressPercent / 100) * target,
              targetValue: target,
              targetUnit: String(targetUnit),
              targetYear: safeParseInt(targetYear, 2030),
              ...notionMetadata,
            },
          });
        } else {
          const existingByTitle = await db.sustainabilityGoal.findFirst({
            where: {
              companyId,
              title: String(title),
            },
          });

          if (existingByTitle) {
            if (
              existingByTitle.notionPageId &&
              existingByTitle.notionPageId !== pageId
            ) {
              errors.push(`Skipped goal "${String(title)}" because it is already linked to a different Notion page.`);
              continue;
            }

            if (!shouldApplyRemoteUpdate(notionMetadata.notionLastEditedAt, existingByTitle.notionLastEditedAt)) {
              skipped++;
              continue;
            }

            await db.sustainabilityGoal.update({
              where: { id: existingByTitle.id },
              data: {
                title: String(title),
                goalType: String(goalType),
                status: String(status) as 'on_track' | 'at_risk' | 'achieved' | 'missed',
                progressPercent,
                currentValue: (progressPercent / 100) * target,
                targetValue: target,
                targetUnit: String(targetUnit),
                targetYear: safeParseInt(targetYear, 2030),
                ...notionMetadata,
              },
            });
          } else {
            await db.sustainabilityGoal.create({
              data: {
                title: String(title),
                goalType: String(goalType),
                status: String(status) as 'on_track' | 'at_risk' | 'achieved' | 'missed',
                progressPercent,
                currentValue: (progressPercent / 100) * target,
                targetValue: target,
                targetUnit: String(targetUnit),
                targetYear: safeParseInt(targetYear, 2030),
                companyId,
                ...notionMetadata,
              },
            });
          }
        }
        synced++;
        importedIds.push(pageId);
      } catch (error) {
        errors.push(`Failed to sync goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    hasMore = !!queryResult.result.nextCursor;
    startCursor = queryResult.result.nextCursor;
  }

  return { synced, skipped, errors, importedIds, reportingPeriods };
}

// Sync ledger entries from Notion
async function syncLedgerFromNotion(
  apiKey: string, 
  databaseId: string, 
  companyId: string,
  editedAfter?: string
): Promise<SyncFromResult> {
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];
  const importedIds: string[] = [];
  const reportingPeriods: string[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  // Get default department
  let defaultDepartment = await db.department.findFirst({ where: { companyId } });
  if (!defaultDepartment) {
    defaultDepartment = await db.department.create({
      data: { name: 'Default Facility', code: 'FAC', companyId },
    });
  }

  while (hasMore) {
    const queryResult = await withRetry(
      () => queryNotionDatabase(apiKey, databaseId, startCursor, editedAfter),
      SYNC_CONFIG.maxRetries,
      'Query ledger entries'
    );

    if (!queryResult.success || !queryResult.result?.results) {
      errors.push(queryResult.error || 'Failed to query ledger');
      break;
    }

    for (const page of queryResult.result.results) {
      try {
        const pageId = page.id as string;
        const notionMetadata = {
          ...buildNotionImportMetadata(page, pageId),
          notionSyncStatus: 'imported_pending_review',
        };
        const normalizedSourceType = normalizeSourceType(
          extractProperty(page, 'Source Type', 'select') || extractStringProperty(page, 'Source Type')
        );
        if (!normalizedSourceType) {
          errors.push(`Skipped ledger entry ${pageId} because the source type is missing or unsupported.`);
          continue;
        }

        const activityValue = extractProperty(page, 'Activity Value', 'number');
        const activity = safeParseFloat(activityValue, Number.NaN);
        if (!Number.isFinite(activity) || activity < 0) {
          errors.push(`Skipped ledger entry ${pageId} because the activity value is invalid.`);
          continue;
        }

        const activityUnit = extractStringProperty(page, 'Activity Unit');
        if (!activityUnit) {
          errors.push(`Skipped ledger entry ${pageId} because the activity unit is missing.`);
          continue;
        }

        const transactionDateValue =
          extractProperty(page, 'Transaction Date', 'date') ||
          extractProperty(page, 'Date', 'date');
        const parsedTransactionDate = transactionDateValue
          ? new Date(String(transactionDateValue))
          : new Date();
        if (Number.isNaN(parsedTransactionDate.getTime())) {
          errors.push(`Skipped ledger entry ${pageId} because the transaction date is invalid.`);
          continue;
        }

        const reportingPeriod = resolveImportedReportingPeriod(
          extractStringProperty(page, 'Reporting Period') || extractStringProperty(page, 'Period'),
          parsedTransactionDate
        );
        const departmentName =
          extractStringProperty(page, 'Facility / Site') ||
          extractStringProperty(page, 'Facility') ||
          extractStringProperty(page, 'Site') ||
          extractStringProperty(page, 'Department') ||
          extractStringProperty(page, 'Department Code');
        const factorRegion =
          extractStringProperty(page, 'Factor Region') || extractStringProperty(page, 'Region');
        const factorYearValue =
          extractProperty(page, 'Factor Year', 'number') || extractProperty(page, 'Year', 'number');
        const factorYear =
          factorYearValue !== null && factorYearValue !== undefined
            ? safeParseInt(factorYearValue, parsedTransactionDate.getUTCFullYear())
            : parsedTransactionDate.getUTCFullYear();
        const sourceDocument =
          extractStringProperty(page, 'Source Document') ||
          extractStringProperty(page, 'Description') ||
          extractStringProperty(page, 'Title') ||
          extractStringProperty(page, 'Name');

        // Find department
        let department = defaultDepartment;
        if (departmentName) {
          const foundDept = await db.department.findFirst({
            where: {
              OR: [
                { name: String(departmentName) },
                { code: String(departmentName).toUpperCase() },
              ],
              companyId,
            },
          });
          if (foundDept) department = foundDept;
        }

        let approvedCalculation;
        try {
          approvedCalculation = await resolveApprovedLedgerCalculation({
            sourceType: normalizedSourceType,
            activityUnit,
            activityValue: activity,
            region: factorRegion || undefined,
            year: factorYear,
          });
        } catch (error) {
          errors.push(
            `Skipped ledger entry ${pageId} because no approved factor matched ${normalizedSourceType}/${activityUnit}${factorRegion ? ` (${factorRegion})` : ''}: ${
              error instanceof Error ? error.message : 'Unknown factor resolution error'
            }`
          );
          continue;
        }

        const existingEntry = await db.carbonLedgerEntry.findFirst({
          where: { notionPageId: pageId },
        });

        const duplicateEntry = existingEntry
          ? null
          : await findMatchingLedgerEntry({
              companyId,
              departmentId: department.id,
              sourceType: normalizedSourceType,
              category: approvedCalculation.category,
              activityValue: activity,
              activityUnit,
              transactionDate: parsedTransactionDate,
              reportingPeriod,
              sourceDocument,
            });

        if (existingEntry) {
          if (!shouldApplyRemoteUpdate(notionMetadata.notionLastEditedAt, existingEntry.notionLastEditedAt)) {
            skipped++;
            continue;
          }

          await db.carbonLedgerEntry.update({
            where: { id: existingEntry.id },
            data: {
              sourceType: normalizedSourceType,
              sourceDocument,
              category: approvedCalculation.category,
              activityValue: activity,
              activityUnit,
              emissionFactor: approvedCalculation.emissionFactor,
              emissionFactorUnit: approvedCalculation.emissionFactorUnit,
              emissionFactorId: approvedCalculation.factorRecord?.id ?? null,
              ...approvedCalculation.factorProvenance,
              co2Equivalent: approvedCalculation.co2Equivalent,
              co2Unit: 'kg CO2e',
              transactionDate: parsedTransactionDate,
              departmentId: department.id,
              verified: false,
              verifiedBy: null,
              verifiedByUserId: null,
              verifiedAt: null,
              factorOverridden: false,
              factorOverrideReason: null,
              factorOverrideAt: null,
              factorOverrideByUserId: null,
              factorOverrideByName: null,
              reportingPeriod,
              ...notionMetadata,
            },
          });
        } else if (duplicateEntry) {
          if (duplicateEntry.notionPageId && duplicateEntry.notionPageId !== pageId) {
            errors.push(
              `Skipped ledger entry ${pageId} because ${getLedgerDuplicateErrorMessage(duplicateEntry)}`
            );
            skipped++;
            continue;
          }

          if (!shouldApplyRemoteUpdate(notionMetadata.notionLastEditedAt, duplicateEntry.notionLastEditedAt)) {
            skipped++;
            continue;
          }

          await db.carbonLedgerEntry.update({
            where: { id: duplicateEntry.id },
            data: {
              sourceType: normalizedSourceType,
              sourceDocument,
              category: approvedCalculation.category,
              activityValue: activity,
              activityUnit,
              emissionFactor: approvedCalculation.emissionFactor,
              emissionFactorUnit: approvedCalculation.emissionFactorUnit,
              emissionFactorId: approvedCalculation.factorRecord?.id ?? null,
              ...approvedCalculation.factorProvenance,
              co2Equivalent: approvedCalculation.co2Equivalent,
              co2Unit: 'kg CO2e',
              transactionDate: parsedTransactionDate,
              departmentId: department.id,
              reportingPeriod,
              verified: false,
              verifiedBy: null,
              verifiedByUserId: null,
              verifiedAt: null,
              factorOverridden: false,
              factorOverrideReason: null,
              factorOverrideAt: null,
              factorOverrideByUserId: null,
              factorOverrideByName: null,
              ...notionMetadata,
            },
          });
        } else {
          await db.carbonLedgerEntry.create({
            data: {
              sourceType: normalizedSourceType,
              sourceDocument,
              category: approvedCalculation.category,
              activityValue: activity,
              activityUnit,
              emissionFactor: approvedCalculation.emissionFactor,
              emissionFactorUnit: approvedCalculation.emissionFactorUnit,
              emissionFactorId: approvedCalculation.factorRecord?.id ?? null,
              ...approvedCalculation.factorProvenance,
              co2Equivalent: approvedCalculation.co2Equivalent,
              co2Unit: 'kg CO2e',
              transactionDate: parsedTransactionDate,
              reportingPeriod,
              departmentId: department.id,
              companyId,
              verified: false,
              ...notionMetadata,
            },
          });
        }
        synced++;
        importedIds.push(pageId);
        reportingPeriods.push(reportingPeriod);
      } catch (error) {
        errors.push(`Failed to sync ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    hasMore = !!queryResult.result.nextCursor;
    startCursor = queryResult.result.nextCursor;
  }

  return { synced, skipped, errors, importedIds, reportingPeriods };
}

async function syncReportsFromNotion(
  apiKey: string,
  databaseId: string,
  companyId: string,
  editedAfter?: string
): Promise<SyncFromResult> {
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];
  const importedIds: string[] = [];
  const reportingPeriods: string[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const queryResult = await withRetry(
      () => queryNotionDatabase(apiKey, databaseId, startCursor, editedAfter),
      SYNC_CONFIG.maxRetries,
      'Query reports'
    );

    if (!queryResult.success || !queryResult.result?.results) {
      errors.push(queryResult.error || 'Failed to query reports');
      break;
    }

    for (const page of queryResult.result.results) {
      try {
        const pageId = page.id as string;
        const notionMetadata = buildNotionImportMetadata(page, pageId);
        const title =
          extractProperty(page, 'Title', 'title') ||
          extractProperty(page, 'Name', 'title') ||
          'Untitled Report';
        const reportType = extractProperty(page, 'Type', 'select') || 'monthly_summary';
        const reportingPeriod =
          extractProperty(page, 'Period', 'rich_text') ||
          new Date().toISOString().slice(0, 7);
        const totalEmissions = extractProperty(page, 'Total Emissions', 'number');
        const status = extractProperty(page, 'Status', 'select') || 'draft';
        const summary =
          extractProperty(page, 'Summary', 'rich_text') ||
          `Imported from Notion: ${String(title)}`;

        const existingReport = await db.report.findFirst({
          where: { notionPageId: pageId },
        });

        if (existingReport) {
          if (!shouldApplyRemoteUpdate(notionMetadata.notionLastEditedAt, existingReport.notionLastEditedAt)) {
            skipped++;
            continue;
          }

          await db.report.update({
            where: { id: existingReport.id },
            data: {
              title: String(title),
              reportType: String(reportType) as 'gap_analysis' | 'monthly_summary' | 'quarterly_review' | 'annual_report',
              reportingPeriod: String(reportingPeriod),
              totalEmissions: safeParseFloat(totalEmissions, 0),
              status: String(status) as 'draft' | 'published' | 'archived',
              summary: String(summary),
              ...notionMetadata,
            },
          });
        } else {
          const existingByPeriod = await db.report.findFirst({
            where: {
              companyId,
              reportType: String(reportType),
              reportingPeriod: String(reportingPeriod),
            },
            orderBy: { updatedAt: 'desc' },
          });

          if (existingByPeriod) {
            if (
              existingByPeriod.notionPageId &&
              existingByPeriod.notionPageId !== pageId
            ) {
              errors.push(
                `Skipped report ${String(reportingPeriod)} (${String(reportType)}) because it is already linked to a different Notion page.`
              );
              continue;
            }

            if (!shouldApplyRemoteUpdate(notionMetadata.notionLastEditedAt, existingByPeriod.notionLastEditedAt)) {
              skipped++;
              continue;
            }

            await db.report.update({
              where: { id: existingByPeriod.id },
              data: {
                title: String(title),
                reportType: String(reportType) as 'gap_analysis' | 'monthly_summary' | 'quarterly_review' | 'annual_report',
                reportingPeriod: String(reportingPeriod),
                totalEmissions: safeParseFloat(totalEmissions, 0),
                status: String(status) as 'draft' | 'published' | 'archived',
                summary: String(summary),
                ...notionMetadata,
              },
            });
          } else {
            await db.report.create({
              data: {
                title: String(title),
                reportType: String(reportType) as 'gap_analysis' | 'monthly_summary' | 'quarterly_review' | 'annual_report',
                reportingPeriod: String(reportingPeriod),
                totalEmissions: safeParseFloat(totalEmissions, 0),
                status: String(status) as 'draft' | 'published' | 'archived',
                summary: String(summary),
                companyId,
                ...notionMetadata,
              },
            });
          }
        }

        synced++;
        importedIds.push(pageId);
        reportingPeriods.push(String(reportingPeriod));
      } catch (error) {
        errors.push(`Failed to sync report: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    hasMore = !!queryResult.result.nextCursor;
    startCursor = queryResult.result.nextCursor;
  }

  return { synced, skipped, errors, importedIds, reportingPeriods };
}
