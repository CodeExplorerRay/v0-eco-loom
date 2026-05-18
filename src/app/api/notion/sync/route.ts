import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireApiSession } from '@/lib/server/auth';
import {
  getCompanyNotionConfig,
  getDecryptedNotionApiKey,
  hasAnyKnowledgeBaseDatabase,
  hasAnyMappedNotionDatabase,
} from '@/lib/server/notion-config';
import { recordKnowledgeBaseSyncAudit } from '@/lib/server/notion-knowledge-base-health';
import {
  syncKnowledgeBaseToNotion,
  syncLedgerEntriesToNotion,
} from '@/lib/server/notion-sync';
import { enforceRateLimit } from '@/lib/server/rate-limit';

const SYNC_BATCH_SIZE = 50;

interface SyncError {
  id: string;
  error: string;
}

interface SyncResult {
  total: number;
  success: number;
  failed: number;
  errors: SyncError[];
}

type NotionDatabaseProperty = {
  id: string;
  type: string;
  [key: string]: unknown;
};

type NotionFilter =
  | {
      and: NotionFilter[];
    }
  | {
      or: NotionFilter[];
    }
  | {
      property: string;
      title?: { equals: string };
      rich_text?: { equals: string };
      select?: { equals: string };
      number?: { equals: number };
      date?: { equals: string };
    };

// Helper: Create Notion page
async function createNotionPage(
  apiKey: string,
  databaseId: string,
  properties: Record<string, unknown>
): Promise<{ success: boolean; pageId?: string; error?: string }> {
  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const code = (data as Record<string, unknown>).code as string;
      const message = (data as Record<string, unknown>).message as string;
      
      if (code === 'unauthorized') {
        return { success: false, error: 'Invalid API key' };
      }
      if (code === 'restricted_resource') {
        return { success: false, error: 'Database not shared with integration' };
      }
      if (code === 'object_not_found') {
        return { success: false, error: 'Database not found' };
      }
      return { success: false, error: message || `HTTP ${response.status}` };
    }

    return { success: true, pageId: (data as Record<string, unknown>).id as string };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function fetchNotionDatabaseSchema(
  apiKey: string,
  databaseId: string
): Promise<{ success: true; properties: Record<string, NotionDatabaseProperty> } | { success: false; error: string }> {
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const code = data.code as string | undefined;
      const message = data.message as string | undefined;

      if (code === 'unauthorized') {
        return { success: false, error: 'Invalid API key' };
      }
      if (code === 'restricted_resource') {
        return { success: false, error: 'Database not shared with integration' };
      }
      if (code === 'object_not_found') {
        return { success: false, error: 'Database not found' };
      }

      return { success: false, error: message || `HTTP ${response.status}` };
    }

    return {
      success: true,
      properties: (data.properties as Record<string, NotionDatabaseProperty> | undefined) || {},
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function findExistingNotionPage(
  apiKey: string,
  databaseId: string,
  filter: NotionFilter
): Promise<{ success: true; pageId: string | null } | { success: false; error: string }> {
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        page_size: 1,
        filter,
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const code = data.code as string | undefined;
      const message = data.message as string | undefined;

      if (code === 'unauthorized') {
        return { success: false, error: 'Invalid API key' };
      }
      if (code === 'restricted_resource') {
        return { success: false, error: 'Database not shared with integration' };
      }
      if (code === 'object_not_found') {
        return { success: false, error: 'Database not found' };
      }

      return { success: false, error: message || `HTTP ${response.status}` };
    }

    const results = Array.isArray(data.results) ? (data.results as Array<Record<string, unknown>>) : [];
    return { success: true, pageId: (results[0]?.id as string | undefined) || null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Helper: Sanitize text
function sanitize(text: string | null | undefined, maxLen = 2000): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : text;
}

// Helper: Safe number
function safeNum(n: number | null | undefined): number | null {
  return n !== null && n !== undefined && !isNaN(n) ? n : null;
}

function hasSelectOption(property: NotionDatabaseProperty | undefined, value: string) {
  const options = ((property?.select as { options?: Array<{ name?: string }> } | undefined)?.options || []);
  return options.some((option) => option.name === value);
}

// Sync departments
async function syncDepartments(apiKey: string, databaseId: string, companyId: string): Promise<SyncResult> {
  const result: SyncResult = { total: 0, success: 0, failed: 0, errors: [] };
  
  const items = await db.department.findMany({
    where: { companyId, notionPageId: null },
    take: SYNC_BATCH_SIZE,
  });
  
  result.total = items.length;

  if (items.length === 0) {
    return result;
  }

  const schema = await fetchNotionDatabaseSchema(apiKey, databaseId);
  if (!schema.success) {
    result.failed = items.length;
    result.errors = items.map((item) => ({ id: item.id, error: schema.error }));
    return result;
  }

  const titlePropertyName =
    (schema.properties.Title?.type === 'title' ? 'Title' : null) ||
    Object.entries(schema.properties).find(([, property]) => property.type === 'title')?.[0];

  if (!titlePropertyName) {
    result.failed = items.length;
    result.errors = items.map((item) => ({
      id: item.id,
      error: 'Facilities / Sites database is missing a title property',
    }));
    return result;
  }

  const codeProperty = schema.properties.Code;
  const budgetProperty = schema.properties.Budget;
  
  for (const item of items) {
    const properties: Record<string, unknown> = {
      [titlePropertyName]: { title: [{ text: { content: sanitize(item.name) } }] },
    };

    const dedupeFilters: NotionFilter[] = [];
    if (codeProperty?.type === 'rich_text') {
      dedupeFilters.push({
        property: 'Code',
        rich_text: { equals: sanitize(item.code, 100) },
      });
    } else if (codeProperty?.type === 'select' && hasSelectOption(codeProperty, sanitize(item.code, 100))) {
      dedupeFilters.push({
        property: 'Code',
        select: { equals: sanitize(item.code, 100) },
      });
    } else {
      dedupeFilters.push({
        property: titlePropertyName,
        title: { equals: sanitize(item.name) },
      });
    }

    if (codeProperty?.type === 'rich_text') {
      properties.Code = { rich_text: [{ text: { content: sanitize(item.code, 100) } }] };
    } else if (codeProperty?.type === 'select') {
      properties.Code = { select: { name: sanitize(item.code, 100) } };
    }

    if (budgetProperty?.type === 'number') {
      properties.Budget = { number: safeNum(item.budget) };
    }

    const existing = await findExistingNotionPage(apiKey, databaseId, {
      and: dedupeFilters,
    });

    if (!existing.success) {
      result.failed++;
      result.errors.push({ id: item.id, error: existing.error });
      continue;
    }

    if (existing.pageId) {
      await db.department.update({
        where: { id: item.id },
        data: {
          notionPageId: existing.pageId,
          notionSyncedAt: new Date(),
          notionSyncStatus: 'linked_existing',
        },
      });
      result.success++;
      continue;
    }

    const res = await createNotionPage(apiKey, databaseId, properties);
    
    if (res.success && res.pageId) {
      await db.department.update({
        where: { id: item.id },
        data: {
          notionPageId: res.pageId,
          notionSyncedAt: new Date(),
          notionSyncStatus: 'exported',
        },
      });
      result.success++;
    } else {
      result.failed++;
      result.errors.push({ id: item.id, error: res.error || 'Unknown error' });
    }
  }
  
  return result;
}

// Sync goals
async function syncGoals(apiKey: string, databaseId: string, companyId: string): Promise<SyncResult> {
  const result: SyncResult = { total: 0, success: 0, failed: 0, errors: [] };
  
  const items = await db.sustainabilityGoal.findMany({
    where: { companyId, notionPageId: null },
    take: SYNC_BATCH_SIZE,
  });
  
  result.total = items.length;
  
  for (const item of items) {
    const existing = await findExistingNotionPage(apiKey, databaseId, {
      and: [
        { property: 'Title', title: { equals: sanitize(item.title) } },
        { property: 'Target Year', number: { equals: item.targetYear } },
      ],
    });

    if (!existing.success) {
      result.failed++;
      result.errors.push({ id: item.id, error: existing.error });
      continue;
    }

    if (existing.pageId) {
      await db.sustainabilityGoal.update({
        where: { id: item.id },
        data: {
          notionPageId: existing.pageId,
          notionSyncedAt: new Date(),
          notionSyncStatus: 'linked_existing',
        },
      });
      result.success++;
      continue;
    }

    const res = await createNotionPage(apiKey, databaseId, {
      'Title': { title: [{ text: { content: sanitize(item.title) } }] },
      'Type': { select: { name: sanitize(item.goalType, 100) } },
      'Status': { select: { name: sanitize(item.status, 100) } },
      'Progress': { number: safeNum(item.progressPercent) },
      'Target Value': { number: safeNum(item.targetValue) },
      'Target Unit': { rich_text: [{ text: { content: sanitize(item.targetUnit, 100) } }] },
      'Target Year': { number: item.targetYear },
    });
    
    if (res.success && res.pageId) {
      await db.sustainabilityGoal.update({
        where: { id: item.id },
        data: {
          notionPageId: res.pageId,
          notionSyncedAt: new Date(),
          notionSyncStatus: 'exported',
        },
      });
      result.success++;
    } else {
      result.failed++;
      result.errors.push({ id: item.id, error: res.error || 'Unknown error' });
    }
  }
  
  return result;
}

// Sync reports
async function syncReports(apiKey: string, databaseId: string, companyId: string): Promise<SyncResult> {
  const result: SyncResult = { total: 0, success: 0, failed: 0, errors: [] };
  
  const items = await db.report.findMany({
    where: { companyId, notionPageId: null, status: 'published' },
    take: SYNC_BATCH_SIZE,
  });
  
  result.total = items.length;
  
  for (const item of items) {
    const existing = await findExistingNotionPage(apiKey, databaseId, {
      and: [
        { property: 'Type', select: { equals: sanitize(item.reportType, 100) } },
        { property: 'Period', rich_text: { equals: sanitize(item.reportingPeriod, 100) } },
      ],
    });

    if (!existing.success) {
      result.failed++;
      result.errors.push({ id: item.id, error: existing.error });
      continue;
    }

    if (existing.pageId) {
      await db.report.update({
        where: { id: item.id },
        data: {
          notionPageId: existing.pageId,
          notionSyncedAt: new Date(),
          notionSyncStatus: 'linked_existing',
        },
      });
      result.success++;
      continue;
    }

    const res = await createNotionPage(apiKey, databaseId, {
      'Title': { title: [{ text: { content: sanitize(item.title) } }] },
      'Type': { select: { name: sanitize(item.reportType, 100) } },
      'Period': { rich_text: [{ text: { content: sanitize(item.reportingPeriod, 100) } }] },
      'Total Emissions': { number: safeNum(item.totalEmissions) },
      'Status': { select: { name: sanitize(item.status, 100) } },
    });
    
    if (res.success && res.pageId) {
      await db.report.update({
        where: { id: item.id },
        data: {
          notionPageId: res.pageId,
          notionSyncedAt: new Date(),
          notionSyncStatus: 'exported',
        },
      });
      result.success++;
    } else {
      result.failed++;
      result.errors.push({ id: item.id, error: res.error || 'Unknown error' });
    }
  }
  
  return result;
}

// POST - Sync to Notion
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
    const { direction, entryIds } = body as {
      direction?: string;
      entryIds?: string[];
    };

    const storedConfig = await getCompanyNotionConfig(auth.session.companyId, {
      adoptLegacy: true,
    });
    
    if (!storedConfig) {
      return NextResponse.json({ 
        error: 'Notion not configured. Please add your API key in the Notion MCP tab.',
        code: 'NOT_CONFIGURED'
      }, { status: 400 });
    }

    const { config, apiKey } = await getDecryptedNotionApiKey(storedConfig);
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Notion not configured. Please add your API key in the Notion MCP tab.',
        code: 'NOT_CONFIGURED'
      }, { status: 400 });
    }

    if (!hasAnyMappedNotionDatabase(config)) {
      return NextResponse.json({ 
        success: false,
        syncedItems: 0,
        error: 'No database IDs configured for this workspace. Add at least one database mapping in the Notion MCP tab.',
        code: 'NO_DATABASES'
      }, { status: 400 });
    }

    const results: Record<string, SyncResult> = {};
    let totalSynced = 0;
    const allErrors: string[] = [];
    const companyId = auth.session.companyId;

    if (direction === 'to_notion') {
      // Sync departments
      if (config.databaseIdDepts) {
        console.log('[Sync] Syncing departments...');
        results.departments = await syncDepartments(apiKey, config.databaseIdDepts, companyId);
        totalSynced += results.departments.success;
        if (results.departments.errors.length > 0) {
          allErrors.push(...results.departments.errors.map(e => `Facility/Site: ${e.error}`));
        }
      }

      // Sync ledger
      if (config.databaseIdLedger) {
        console.log('[Sync] Syncing ledger entries...');
        const ledgerSync = await syncLedgerEntriesToNotion({
          companyId,
          entryIds: Array.isArray(entryIds) ? entryIds : undefined,
          resyncLinked: !Array.isArray(entryIds) || entryIds.length === 0,
        });

        if (ledgerSync.status === 'completed') {
          results.ledger = ledgerSync.result;
          totalSynced += results.ledger.success;
          if (results.ledger.errors.length > 0) {
            allErrors.push(...results.ledger.errors.slice(0, 3).map(e => `Ledger: ${e.error}`));
          }
        } else {
          results.ledger = { total: 0, success: 0, failed: 0, errors: [] };
          allErrors.push(`Ledger: ${ledgerSync.reason}`);
        }
      }

      // Sync goals
      if (config.databaseIdGoals) {
        console.log('[Sync] Syncing goals...');
        results.goals = await syncGoals(apiKey, config.databaseIdGoals, companyId);
        totalSynced += results.goals.success;
        if (results.goals.errors.length > 0) {
          allErrors.push(...results.goals.errors.map(e => `Goal: ${e.error}`));
        }
      }

      // Sync reports
      if (config.databaseIdReports) {
        console.log('[Sync] Syncing reports...');
        results.reports = await syncReports(apiKey, config.databaseIdReports, companyId);
        totalSynced += results.reports.success;
        if (results.reports.errors.length > 0) {
          allErrors.push(...results.reports.errors.map(e => `Report: ${e.error}`));
        }
      }

      if (hasAnyKnowledgeBaseDatabase(config)) {
        console.log('[Sync] Syncing knowledge base...');
        const knowledgeBaseSync = await syncKnowledgeBaseToNotion({
          companyId,
          ignoreSyncEnabled: true,
        });
        if (knowledgeBaseSync.status === 'completed') {
          await recordKnowledgeBaseSyncAudit(auth.session, knowledgeBaseSync.result, 'sync_to_notion');
          results.knowledgeBase = knowledgeBaseSync.result;
          totalSynced += knowledgeBaseSync.result.success;
          if (knowledgeBaseSync.result.errors.length > 0) {
            allErrors.push(
              ...knowledgeBaseSync.result.errors.slice(0, 3).map((e) => `Knowledge Base: ${e.error}`)
            );
          }
        } else {
          results.knowledgeBase = { total: 0, success: 0, failed: 0, errors: [] };
          allErrors.push(`Knowledge Base: ${knowledgeBaseSync.reason}`);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      syncedItems: totalSynced,
      results,
      errors: allErrors.length > 0 ? allErrors : undefined,
      message: totalSynced > 0 
        ? `Successfully synced ${totalSynced} items to Notion`
        : 'No new items to sync. Items may already be synced or there was an error.'
    });

  } catch (error) {
    console.error('[Sync] Error:', error);
    return NextResponse.json({ 
      error: 'Sync failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
