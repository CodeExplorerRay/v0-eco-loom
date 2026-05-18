import { Prisma, type NotionConfig } from '@prisma/client';
import { db } from '@/lib/db';
import {
  NOTION_KNOWLEDGE_BASE_ARTICLES,
  type NotionKnowledgeBaseArticle,
} from '@/lib/notion/notion-knowledge-base';
import {
  getCompanyNotionConfig,
  getDecryptedNotionApiKey,
} from '@/lib/server/notion-config';

const SYNC_BATCH_SIZE = 50;
const NOTION_LEGACY_API_VERSION = '2022-06-28';
const NOTION_DATA_SOURCE_API_VERSION = '2025-09-03';
type LedgerSyncItem = Prisma.CarbonLedgerEntryGetPayload<{
  include: { department: true };
}>;
type GoalSyncItem = Prisma.SustainabilityGoalGetPayload<{
  include: { department: true };
}>;

export interface SyncError {
  id: string;
  error: string;
}

export interface SyncResult {
  total: number;
  success: number;
  failed: number;
  errors: SyncError[];
}

type LedgerSyncOptions = {
  companyId: string;
  entryIds?: string[];
  resyncLinked?: boolean;
};

type GoalSyncOptions = {
  companyId: string;
  goalIds?: string[];
};

type LedgerSyncOutcome =
  | { status: 'skipped'; reason: string }
  | { status: 'completed'; result: SyncResult };

type GoalSyncOutcome =
  | { status: 'skipped'; reason: string }
  | { status: 'completed'; result: SyncResult };
type KnowledgeBaseSyncOutcome =
  | { status: 'skipped'; reason: string }
  | { status: 'completed'; result: SyncResult };

type NotionDatabaseProperty = {
  id: string;
  type: string;
  [key: string]: unknown;
};

type NotionDataSourceSummary = {
  id: string;
  name?: string;
};

type KnowledgeBaseTarget =
  | {
      kind: 'database';
      id: string;
      schema: Record<string, NotionDatabaseProperty>;
    }
  | {
      kind: 'data_source';
      id: string;
      schema: Record<string, NotionDatabaseProperty>;
    };

type KnowledgeBaseDatabaseConfig = Pick<
  NotionConfig,
  'databaseIdKnowledgeBase'
>;

type PreparedKnowledgeBaseTarget = {
  target: KnowledgeBaseTarget;
  titlePropertyName: string;
  articleIdPropertyName: string | null;
};

type NotionFilter =
  | {
      and: NotionFilter[];
    }
  | {
      property: string;
      title?: { equals: string };
      rich_text?: { equals: string };
      select?: { equals: string };
      status?: { equals: string };
      number?: { equals: number };
      date?: { equals: string };
    };

function getNotionApiError(
  data: Record<string, unknown>,
  fallbackStatus: number
): string {
  const code = data.code as string | undefined;
  const message = data.message as string | undefined;
  const loweredMessage = message?.toLowerCase() || '';

  if (code === 'unauthorized') {
    return 'Invalid API key';
  }

  if (code === 'restricted_resource') {
    return 'Database not shared with integration';
  }

  if (code === 'object_not_found') {
    if (loweredMessage.includes('shared with your integration')) {
      return 'Database not shared with integration';
    }

    return 'Database not found';
  }

  return message || `HTTP ${fallbackStatus}`;
}

async function createNotionPage(
  apiKey: string,
  databaseId: string,
  properties: Record<string, unknown>
): Promise<{ success: boolean; pageId?: string; error?: string }> {
  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_LEGACY_API_VERSION,
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return { success: false, error: getNotionApiError(data, response.status) };
    }

    return { success: true, pageId: data.id as string };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function createNotionPageInDataSource(
  apiKey: string,
  dataSourceId: string,
  properties: Record<string, unknown>
): Promise<{ success: boolean; pageId?: string; error?: string }> {
  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_DATA_SOURCE_API_VERSION,
      },
      body: JSON.stringify({
        parent: { data_source_id: dataSourceId },
        properties,
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return { success: false, error: getNotionApiError(data, response.status) };
    }

    return { success: true, pageId: data.id as string };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function updateNotionPage(
  apiKey: string,
  pageId: string,
  properties: Record<string, unknown>
): Promise<{ success: boolean; error?: string; notFound?: boolean }> {
  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ properties }),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const code = data.code as string | undefined;
      if (code === 'object_not_found') {
        return { success: false, error: 'Linked Notion page was not found', notFound: true };
      }
      if (code === 'restricted_resource') {
        return { success: false, error: 'Page not shared with integration' };
      }

      return { success: false, error: getNotionApiError(data, response.status) };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function fetchNotionBlockChildren(
  apiKey: string,
  blockId: string
): Promise<{ success: true; results: Array<Record<string, unknown>> } | { success: false; error: string }> {
  try {
    const response = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      return {
        success: false,
        error: (data.message as string | undefined) || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      results: Array.isArray(data.results) ? (data.results as Array<Record<string, unknown>>) : [],
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function archiveNotionBlock(
  apiKey: string,
  blockId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        archived: true,
      }),
    });

    if (response.ok) {
      return { success: true };
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      success: false,
      error: (data.message as string | undefined) || `HTTP ${response.status}`,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function appendNotionBlockChildren(
  apiKey: string,
  blockId: string,
  children: Array<Record<string, unknown>>
): Promise<{ success: boolean; error?: string }> {
  if (children.length === 0) {
    return { success: true };
  }

  for (let index = 0; index < children.length; index += 100) {
    const chunk = children.slice(index, index + 100);
    try {
      const response = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          children: chunk,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as Record<string, unknown>;
        return {
          success: false,
          error: (data.message as string | undefined) || `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  return { success: true };
}

function buildKnowledgeBasePageBlocks(content: string) {
  const blocks: Array<Record<string, unknown>> = [];
  const lines = content.split('\n');

  const pushParagraph = (text: string) => {
    const sanitized = sanitize(text, 1800);
    if (!sanitized) {
      return;
    }
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: sanitized } }],
      },
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const text = line.replace(/^\d+\.\s+/, '');
      const sanitized = sanitize(text, 1800);
      if (sanitized) {
        blocks.push({
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [{ type: 'text', text: { content: sanitized } }],
          },
        });
      }
      continue;
    }

    if (line.startsWith('- ')) {
      const sanitized = sanitize(line.slice(2), 1800);
      if (sanitized) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: sanitized } }],
          },
        });
      }
      continue;
    }

    if (!/[.?!:]$/.test(line) && line.length < 90) {
      const sanitized = sanitize(line, 1800);
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: sanitized } }],
        },
      });
      continue;
    }

    pushParagraph(line);
  }

  return blocks;
}

async function replaceNotionPageContent(
  apiKey: string,
  pageId: string,
  blocks: Array<Record<string, unknown>>
): Promise<{ success: boolean; error?: string }> {
  const existingChildren = await fetchNotionBlockChildren(apiKey, pageId);
  if (!existingChildren.success) {
    return { success: false, error: existingChildren.error };
  }

  for (const child of existingChildren.results) {
    const childId = typeof child.id === 'string' ? child.id : null;
    if (!childId) {
      continue;
    }

    const archived = await archiveNotionBlock(apiKey, childId);
    if (!archived.success) {
      return { success: false, error: archived.error };
    }
  }

  return appendNotionBlockChildren(apiKey, pageId, blocks);
}

async function archiveNotionPage(
  apiKey: string,
  pageId: string
): Promise<{ success: boolean; error?: string; notFound?: boolean }> {
  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        archived: true,
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const code = data.code as string | undefined;
      const message = data.message as string | undefined;

      if (code === 'object_not_found') {
        return { success: false, error: 'Linked Notion page was not found', notFound: true };
      }
      if (code === 'unauthorized') {
        return { success: false, error: 'Invalid API key' };
      }
      if (code === 'restricted_resource') {
        return { success: false, error: 'Page not shared with integration' };
      }

      return { success: false, error: message || `HTTP ${response.status}` };
    }

    return { success: true };
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
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_LEGACY_API_VERSION,
      },
      body: JSON.stringify({
        page_size: 1,
        filter,
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return { success: false, error: getNotionApiError(data, response.status) };
    }

    const results = Array.isArray(data.results) ? (data.results as Array<Record<string, unknown>>) : [];
    return { success: true, pageId: (results[0]?.id as string | undefined) || null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function findExistingNotionPageInDataSource(
  apiKey: string,
  dataSourceId: string,
  filter: NotionFilter
): Promise<{ success: true; pageId: string | null } | { success: false; error: string }> {
  try {
    const response = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_DATA_SOURCE_API_VERSION,
      },
      body: JSON.stringify({
        page_size: 1,
        filter,
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return { success: false, error: getNotionApiError(data, response.status) };
    }

    const results = Array.isArray(data.results) ? (data.results as Array<Record<string, unknown>>) : [];
    return { success: true, pageId: (results[0]?.id as string | undefined) || null };
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
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': NOTION_LEGACY_API_VERSION,
      },
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return { success: false, error: getNotionApiError(data, response.status) };
    }

    return {
      success: true,
      properties: (data.properties as Record<string, NotionDatabaseProperty> | undefined) || {},
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function fetchNotionDataSourceSchema(
  apiKey: string,
  dataSourceId: string
): Promise<{ success: true; properties: Record<string, NotionDatabaseProperty> } | { success: false; error: string }> {
  try {
    const response = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': NOTION_DATA_SOURCE_API_VERSION,
      },
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return { success: false, error: getNotionApiError(data, response.status) };
    }

    return {
      success: true,
      properties: (data.properties as Record<string, NotionDatabaseProperty> | undefined) || {},
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function resolveNotionDataSourceId(
  apiKey: string,
  configuredId: string
): Promise<{ success: true; dataSourceId: string } | { success: false; error: string }> {
  const directDataSource = await fetch(`https://api.notion.com/v1/data_sources/${configuredId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_DATA_SOURCE_API_VERSION,
    },
  })
    .then(async (response) => {
      const data = (await response.json()) as Record<string, unknown>;
      return { response, data };
    })
    .catch((error: unknown) => ({
      response: null,
      data: { message: error instanceof Error ? error.message : 'Network error' },
    }));

  if (directDataSource.response?.ok) {
    const id = directDataSource.data.id as string | undefined;
    if (id) {
      return { success: true, dataSourceId: id };
    }
  }

  const response = await fetch(`https://api.notion.com/v1/databases/${configuredId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_DATA_SOURCE_API_VERSION,
    },
  }).catch((error: unknown) => ({
    ok: false,
    status: 500,
    json: async () => ({ message: error instanceof Error ? error.message : 'Network error' }),
  }));

  const data = (await response.json()) as Record<string, unknown>;
  const childDataSourceIds = Array.isArray(
    (data.additional_data as { child_data_source_ids?: unknown } | undefined)?.child_data_source_ids
  )
    ? ((data.additional_data as { child_data_source_ids?: unknown[] }).child_data_source_ids as unknown[])
        .filter((value): value is string => typeof value === 'string')
    : [];

  if (childDataSourceIds[0]) {
    return { success: true, dataSourceId: childDataSourceIds[0] };
  }

  if (!response.ok) {
    return { success: false, error: getNotionApiError(data, response.status) };
  }

  const dataSources = Array.isArray(data.data_sources)
    ? (data.data_sources as NotionDataSourceSummary[])
    : [];
  const primaryDataSourceId = typeof dataSources[0]?.id === 'string' ? dataSources[0].id : null;

  if (!primaryDataSourceId) {
    return { success: false, error: 'No child data source found for this database' };
  }

  return { success: true, dataSourceId: primaryDataSourceId };
}

async function prepareKnowledgeBaseTarget(
  apiKey: string,
  configuredId: string
): Promise<{ success: true; target: KnowledgeBaseTarget } | { success: false; error: string }> {
  const legacyDatabaseSchema = await fetchNotionDatabaseSchema(apiKey, configuredId);
  let dataSourceError: string | null = null;
  const resolvedDataSource = await resolveNotionDataSourceId(apiKey, configuredId);
  if (resolvedDataSource.success) {
    const dataSourceSchema = await fetchNotionDataSourceSchema(apiKey, resolvedDataSource.dataSourceId);
    if (dataSourceSchema.success) {
      return {
        success: true,
        target: {
          kind: 'data_source',
          id: resolvedDataSource.dataSourceId,
          schema: dataSourceSchema.properties,
        },
      };
    }

    dataSourceError = dataSourceSchema.error;

    if (legacyDatabaseSchema.success) {
      return {
        success: true,
        target: {
          kind: 'data_source',
          id: resolvedDataSource.dataSourceId,
          schema: legacyDatabaseSchema.properties,
        },
      };
    }
  } else {
    dataSourceError = resolvedDataSource.error;
  }

  if (legacyDatabaseSchema.success) {
    return {
      success: true,
      target: {
        kind: 'database',
        id: configuredId,
        schema: legacyDatabaseSchema.properties,
      },
    };
  }

  return {
    success: false,
    error: dataSourceError || legacyDatabaseSchema.error || 'Knowledge Base target could not be resolved',
  };
}

function getChoiceOptions(property: NotionDatabaseProperty | undefined) {
  if (property?.type === 'select') {
    return (
      ((property.select as { options?: Array<{ name?: string }> } | undefined)?.options || []) as Array<{
        name?: string;
      }>
    );
  }

  if (property?.type === 'status') {
    return (
      ((property.status as { options?: Array<{ name?: string }> } | undefined)?.options || []) as Array<{
        name?: string;
      }>
    );
  }

  return [];
}

function normalizeChoiceValue(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function hasSelectOption(property: NotionDatabaseProperty | undefined, value: string) {
  const sanitized = sanitize(value, 100);
  if (!sanitized) {
    return false;
  }

  return getChoiceOptions(property).some(
    (option) => option.name && normalizeChoiceValue(option.name) === normalizeChoiceValue(sanitized)
  );
}

function resolveChoiceOptionName(
  property: NotionDatabaseProperty | undefined,
  value: string
): string | null {
  const sanitized = sanitize(value, 100);
  if (!sanitized) {
    return null;
  }

  const matchedOption = getChoiceOptions(property).find(
    (option) => option.name && normalizeChoiceValue(option.name) === normalizeChoiceValue(sanitized)
  );

  if (matchedOption?.name) {
    return matchedOption.name;
  }

  if (property?.type === 'select') {
    return sanitized;
  }

  return null;
}

function findPropertyName(
  properties: Record<string, NotionDatabaseProperty>,
  candidates: string[],
  supportedTypes: string[]
) {
  return candidates.find((candidate) => supportedTypes.includes(properties[candidate]?.type || '')) || null;
}

function buildStringPropertyValue(
  property: NotionDatabaseProperty | undefined,
  value: string,
  maxLen = 100
) {
  const sanitized = sanitize(value, maxLen);
  if (!sanitized || !property) {
    return null;
  }

  if (property.type === 'rich_text') {
    return { rich_text: [{ text: { content: sanitized } }] };
  }

  if (property.type === 'select') {
    const choiceName = resolveChoiceOptionName(property, sanitized);
    return choiceName ? { select: { name: choiceName } } : null;
  }

  if (property.type === 'status') {
    const choiceName = resolveChoiceOptionName(property, sanitized);
    return choiceName ? { status: { name: choiceName } } : null;
  }

  return null;
}

function buildLongRichTextPropertyValue(
  property: NotionDatabaseProperty | undefined,
  value: string,
  chunkSize = 1800
) {
  if (property?.type !== 'rich_text') {
    return null;
  }

  const sanitized = value.trim();
  if (!sanitized) {
    return null;
  }

  const chunks: Array<{ text: { content: string } }> = [];
  for (let start = 0; start < sanitized.length; start += chunkSize) {
    chunks.push({
      text: {
        content: sanitized.slice(start, start + chunkSize),
      },
    });
  }

  return chunks.length > 0 ? { rich_text: chunks } : null;
}

function buildStringEqualsFilter(
  propertyName: string | null,
  property: NotionDatabaseProperty | undefined,
  value: string,
  maxLen = 100
): NotionFilter | null {
  const sanitized = sanitize(value, maxLen);
  if (!propertyName || !property || !sanitized) {
    return null;
  }

  if (property.type === 'rich_text') {
    return {
      property: propertyName,
      rich_text: { equals: sanitized },
    };
  }

  if (property.type === 'select') {
    const choiceName = resolveChoiceOptionName(property, sanitized);
    return choiceName
      ? {
          property: propertyName,
          select: { equals: choiceName },
        }
      : null;
  }

  if (property.type === 'status') {
    const choiceName = resolveChoiceOptionName(property, sanitized);
    return choiceName
      ? {
          property: propertyName,
          status: { equals: choiceName },
        }
      : null;
  }

  return null;
}

function getFacilityPropertyName(properties: Record<string, NotionDatabaseProperty>) {
  const candidates = ['Facility / Site', 'Facility', 'Site', 'Department'];
  return findPropertyName(properties, candidates, ['rich_text', 'select', 'status']);
}

function getTitlePropertyName(properties: Record<string, NotionDatabaseProperty>) {
  return (
    (properties.Title?.type === 'title' ? 'Title' : null) ||
    Object.entries(properties).find(([, property]) => property.type === 'title')?.[0] ||
    'Title'
  );
}

function buildKnowledgeBaseNotionProperties(
  article: NotionKnowledgeBaseArticle,
  properties: Record<string, NotionDatabaseProperty>
) {
  const titlePropertyName = getTitlePropertyName(properties);
  const payload: Record<string, unknown> = {
    [titlePropertyName]: {
      title: [{ text: { content: sanitize(article.title, 200) } }],
    },
  };

  const articleIdPropertyName = findPropertyName(
    properties,
    ['Article ID', 'Knowledge ID', 'Slug', 'Key'],
    ['rich_text', 'select', 'status']
  );
  const articleIdValue = buildStringPropertyValue(
    articleIdPropertyName ? properties[articleIdPropertyName] : undefined,
    article.id,
    120
  );
  if (articleIdPropertyName && articleIdValue) {
    payload[articleIdPropertyName] = articleIdValue;
  }

  const categoryPropertyName = findPropertyName(properties, ['Category', 'Section'], [
    'rich_text',
    'select',
    'status',
  ]);
  const categoryValue = buildStringPropertyValue(
    categoryPropertyName ? properties[categoryPropertyName] : undefined,
    article.category,
    100
  );
  if (categoryPropertyName && categoryValue) {
    payload[categoryPropertyName] = categoryValue;
  }

  const audiencePropertyName = findPropertyName(properties, ['Audience'], [
    'rich_text',
    'select',
    'status',
  ]);
  const audienceValue = buildStringPropertyValue(
    audiencePropertyName ? properties[audiencePropertyName] : undefined,
    article.audience,
    100
  );
  if (audiencePropertyName && audienceValue) {
    payload[audiencePropertyName] = audienceValue;
  }

  const summaryPropertyName = findPropertyName(properties, ['Summary', 'Overview'], ['rich_text']);
  const summaryValue = buildLongRichTextPropertyValue(
    summaryPropertyName ? properties[summaryPropertyName] : undefined,
    article.summary
  );
  if (summaryPropertyName && summaryValue) {
    payload[summaryPropertyName] = summaryValue;
  }

  const contentPropertyName = findPropertyName(properties, ['Content', 'Details', 'Body', 'Article'], [
    'rich_text',
  ]);
  const contentValue = buildLongRichTextPropertyValue(
    contentPropertyName ? properties[contentPropertyName] : undefined,
    article.content
  );
  if (contentPropertyName && contentValue) {
    payload[contentPropertyName] = contentValue;
  }

  const sourcePropertyName = findPropertyName(properties, ['Source', 'Owner'], [
    'rich_text',
    'select',
    'status',
  ]);
  const sourceValue = buildStringPropertyValue(
    sourcePropertyName ? properties[sourcePropertyName] : undefined,
    'Eco-Loom Knowledge Base',
    100
  );
  if (sourcePropertyName && sourceValue) {
    payload[sourcePropertyName] = sourceValue;
  }

  const updatedPropertyName = findPropertyName(properties, ['Updated At', 'Synced At'], ['date']);
  if (updatedPropertyName && properties[updatedPropertyName]?.type === 'date') {
    payload[updatedPropertyName] = { date: { start: new Date().toISOString() } };
  }

  return payload;
}

function hasKnowledgeBaseDestination(config: KnowledgeBaseDatabaseConfig) {
  return Boolean(config.databaseIdKnowledgeBase);
}

function getKnowledgeBaseTargetId(
  config: KnowledgeBaseDatabaseConfig
) {
  return config.databaseIdKnowledgeBase || null;
}

function sanitize(text: string | null | undefined, maxLen = 2000): string {
  if (!text) return '';
  return text.length > maxLen ? `${text.substring(0, maxLen - 3)}...` : text;
}

function safeNum(n: number | null | undefined): number | null {
  return n !== null && n !== undefined && !Number.isNaN(n) ? n : null;
}

function safeDate(d: Date | null | undefined): string | null {
  if (!d) return null;

  try {
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

function buildLedgerNotionProperties(
  item: LedgerSyncItem,
  properties: Record<string, NotionDatabaseProperty>,
  facilityPropertyName: string | null
) {
  const titlePropertyName = getTitlePropertyName(properties);
  const payload: Record<string, unknown> = {
    [titlePropertyName]: {
      title: [{ text: { content: sanitize(`${item.sourceType} - ${item.reportingPeriod}`) } }],
    },
  };

  const sourceTypePropertyName = findPropertyName(properties, ['Source Type', 'Source'], [
    'select',
    'status',
    'rich_text',
  ]);
  const sourceTypeValue = buildStringPropertyValue(
    sourceTypePropertyName ? properties[sourceTypePropertyName] : undefined,
    item.sourceType,
    100
  );
  if (sourceTypePropertyName && sourceTypeValue) {
    payload[sourceTypePropertyName] = sourceTypeValue;
  }

  const categoryPropertyName = findPropertyName(properties, ['Category', 'Scope'], [
    'select',
    'status',
    'rich_text',
  ]);
  const categoryValue = buildStringPropertyValue(
    categoryPropertyName ? properties[categoryPropertyName] : undefined,
    item.category,
    100
  );
  if (categoryPropertyName && categoryValue) {
    payload[categoryPropertyName] = categoryValue;
  }

  if (properties['Activity Value']?.type === 'number') {
    payload['Activity Value'] = { number: safeNum(item.activityValue) };
  }

  const activityUnitPropertyName = findPropertyName(properties, ['Activity Unit', 'Unit'], [
    'select',
    'status',
    'rich_text',
  ]);
  const activityUnitValue = buildStringPropertyValue(
    activityUnitPropertyName ? properties[activityUnitPropertyName] : undefined,
    item.activityUnit,
    100
  );
  if (activityUnitPropertyName && activityUnitValue) {
    payload[activityUnitPropertyName] = activityUnitValue;
  }

  if (properties['CO2 Equivalent']?.type === 'number') {
    payload['CO2 Equivalent'] = { number: safeNum(item.co2Equivalent) };
  }

  const dateStr = safeDate(item.transactionDate);
  if (dateStr && properties['Transaction Date']?.type === 'date') {
    payload['Transaction Date'] = { date: { start: dateStr } };
  }

  if (properties.Verified?.type === 'checkbox') {
    payload.Verified = { checkbox: item.verified || false };
  }

  if (facilityPropertyName) {
    const facilityValue = buildStringPropertyValue(
      properties[facilityPropertyName],
      item.department?.name || 'N/A',
      100
    );
    if (facilityValue) {
      payload[facilityPropertyName] = facilityValue;
    }
  }

  const sourceDocumentPropertyName = findPropertyName(
    properties,
    ['Source Document', 'Document', 'Description'],
    ['rich_text']
  );
  const sourceDocumentValue =
    sourceDocumentPropertyName && item.sourceDocument
      ? buildStringPropertyValue(properties[sourceDocumentPropertyName], item.sourceDocument, 200)
      : null;
  if (sourceDocumentPropertyName && sourceDocumentValue) {
    payload[sourceDocumentPropertyName] = sourceDocumentValue;
  }

  return payload;
}

function buildGoalNotionProperties(
  item: GoalSyncItem,
  properties: Record<string, NotionDatabaseProperty>,
  facilityPropertyName: string | null
) {
  const titlePropertyName = getTitlePropertyName(properties);
  const payload: Record<string, unknown> = {
    [titlePropertyName]: {
      title: [{ text: { content: sanitize(item.title) } }],
    },
  };

  if (properties.Type?.type === 'select' && hasSelectOption(properties.Type, sanitize(item.goalType, 100))) {
    payload.Type = { select: { name: sanitize(item.goalType, 100) } };
  } else if (properties.Type?.type === 'rich_text') {
    payload.Type = { rich_text: [{ text: { content: sanitize(item.goalType, 100) } }] };
  }

  if (properties.Status?.type === 'select' && hasSelectOption(properties.Status, sanitize(item.status, 100))) {
    payload.Status = { select: { name: sanitize(item.status, 100) } };
  } else if (properties.Status?.type === 'rich_text') {
    payload.Status = { rich_text: [{ text: { content: sanitize(item.status, 100) } }] };
  }

  if (properties.Progress?.type === 'number') {
    payload.Progress = { number: safeNum(item.progressPercent) };
  }

  if (properties['Target Value']?.type === 'number') {
    payload['Target Value'] = { number: safeNum(item.targetValue) };
  }

  if (properties['Target Unit']?.type === 'rich_text') {
    payload['Target Unit'] = {
      rich_text: [{ text: { content: sanitize(item.targetUnit, 100) } }],
    };
  }

  if (properties['Target Year']?.type === 'number') {
    payload['Target Year'] = { number: item.targetYear };
  }

  if (properties['Current Value']?.type === 'number') {
    payload['Current Value'] = { number: safeNum(item.currentValue) };
  }

  if (properties['Baseline Value']?.type === 'number') {
    payload['Baseline Value'] = { number: safeNum(item.baselineValue) };
  }

  if (properties['Baseline Year']?.type === 'number' && item.baselineYear) {
    payload['Baseline Year'] = { number: item.baselineYear };
  }

  if (properties.Description?.type === 'rich_text' && item.description) {
    payload.Description = {
      rich_text: [{ text: { content: sanitize(item.description) } }],
    };
  }

  if (facilityPropertyName) {
    payload[facilityPropertyName] = {
      rich_text: [{ text: { content: sanitize(item.department?.name || 'Company-wide', 100) } }],
    };
  }

  return payload;
}

export async function syncLedgerEntriesToNotion(
  options: LedgerSyncOptions
): Promise<LedgerSyncOutcome> {
  const storedConfig = await getCompanyNotionConfig(options.companyId, {
    adoptLegacy: true,
  });
  if (!storedConfig) {
    return { status: 'skipped', reason: 'Notion is not configured' };
  }

  const { config, apiKey } = await getDecryptedNotionApiKey(storedConfig);
  if (!config.syncEnabled) {
    return { status: 'skipped', reason: 'Automatic Notion sync is disabled' };
  }

  if (!apiKey) {
    return { status: 'skipped', reason: 'Missing Notion API key' };
  }

  if (!config.databaseIdLedger) {
    return { status: 'skipped', reason: 'Missing Notion ledger database ID' };
  }

  const schema = await fetchNotionDatabaseSchema(apiKey, config.databaseIdLedger);
  if (!schema.success) {
    return { status: 'skipped', reason: schema.error };
  }

  const where = options.entryIds?.length
    ? {
        companyId: options.companyId,
        id: { in: options.entryIds },
      }
    : options.resyncLinked
      ? {
          companyId: options.companyId,
        }
    : {
        companyId: options.companyId,
        notionPageId: null,
      };

  const items = await db.carbonLedgerEntry.findMany({
    where,
    include: { department: true },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    take:
      options.entryIds?.length ? options.entryIds.length : options.resyncLinked ? undefined : SYNC_BATCH_SIZE,
  });

  const result: SyncResult = {
    total: items.length,
    success: 0,
    failed: 0,
    errors: [],
  };
  const facilityPropertyName = getFacilityPropertyName(schema.properties);

  for (const item of items) {
    const properties = buildLedgerNotionProperties(item, schema.properties, facilityPropertyName);
    const dateStr = safeDate(item.transactionDate);
    if (item.notionPageId) {
      const updateResult = await updateNotionPage(apiKey, item.notionPageId, properties);

      if (updateResult.success) {
        await db.carbonLedgerEntry.update({
          where: { id: item.id },
          data: {
            notionSyncedAt: new Date(),
            notionSyncStatus: 'updated',
          },
        });
        result.success++;
        continue;
      }

      if (!updateResult.notFound) {
        result.failed++;
        result.errors.push({ id: item.id, error: updateResult.error || 'Notion update failed' });
        continue;
      }

      await db.carbonLedgerEntry.update({
        where: { id: item.id },
        data: {
          notionPageId: null,
          notionSyncStatus: 'missing_remote_page',
        },
      });
    }

    const dedupeFilters: NotionFilter[] = [];

    if (schema.properties['Activity Value']?.type === 'number') {
      dedupeFilters.push({ property: 'Activity Value', number: { equals: item.activityValue } });
    }

    const sourceTypePropertyName = findPropertyName(
      schema.properties,
      ['Source Type', 'Source'],
      ['select', 'status', 'rich_text']
    );
    const sourceTypeFilter = buildStringEqualsFilter(
      sourceTypePropertyName,
      sourceTypePropertyName ? schema.properties[sourceTypePropertyName] : undefined,
      item.sourceType,
      100
    );
    if (sourceTypeFilter) {
      dedupeFilters.push(sourceTypeFilter);
    }

    const activityUnitPropertyName = findPropertyName(schema.properties, ['Activity Unit', 'Unit'], [
      'select',
      'status',
      'rich_text',
    ]);
    const activityUnitFilter = buildStringEqualsFilter(
      activityUnitPropertyName,
      activityUnitPropertyName ? schema.properties[activityUnitPropertyName] : undefined,
      item.activityUnit,
      100
    );
    if (activityUnitFilter) {
      dedupeFilters.push(activityUnitFilter);
    }

    if (schema.properties['CO2 Equivalent']?.type === 'number') {
      dedupeFilters.push({ property: 'CO2 Equivalent', number: { equals: item.co2Equivalent } });
    }

    if (dateStr && schema.properties['Transaction Date']?.type === 'date') {
      dedupeFilters.push({ property: 'Transaction Date', date: { equals: dateStr } });
    }

    if (facilityPropertyName) {
      const facilityFilter = buildStringEqualsFilter(
        facilityPropertyName,
        schema.properties[facilityPropertyName],
        item.department?.name || 'N/A',
        100
      );
      if (facilityFilter) {
        dedupeFilters.push(facilityFilter);
      }
    }

    const categoryPropertyName = findPropertyName(schema.properties, ['Category', 'Scope'], [
      'select',
      'status',
      'rich_text',
    ]);
    const categoryFilter = buildStringEqualsFilter(
      categoryPropertyName,
      categoryPropertyName ? schema.properties[categoryPropertyName] : undefined,
      item.category,
      100
    );
    if (categoryFilter) {
      dedupeFilters.push(categoryFilter);
    }

    if (dedupeFilters.length > 0) {
      const existing = await findExistingNotionPage(apiKey, config.databaseIdLedger, {
        and: dedupeFilters,
      });
      if (!existing.success) {
        result.failed++;
        result.errors.push({ id: item.id, error: existing.error });
        continue;
      }

      if (existing.pageId) {
        await db.carbonLedgerEntry.update({
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
    }

    const res = await createNotionPage(apiKey, config.databaseIdLedger, properties);

    if (res.success && res.pageId) {
      await db.carbonLedgerEntry.update({
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

  return { status: 'completed', result };
}

export async function syncGoalsToNotion(
  options: GoalSyncOptions
): Promise<GoalSyncOutcome> {
  const storedConfig = await getCompanyNotionConfig(options.companyId, {
    adoptLegacy: true,
  });
  if (!storedConfig) {
    return { status: 'skipped', reason: 'Notion is not configured' };
  }

  const { config, apiKey } = await getDecryptedNotionApiKey(storedConfig);
  if (!config.syncEnabled) {
    return { status: 'skipped', reason: 'Automatic Notion sync is disabled' };
  }

  if (!apiKey) {
    return { status: 'skipped', reason: 'Missing Notion API key' };
  }

  if (!config.databaseIdGoals) {
    return { status: 'skipped', reason: 'Missing Notion goals database ID' };
  }

  const schema = await fetchNotionDatabaseSchema(apiKey, config.databaseIdGoals);
  if (!schema.success) {
    return { status: 'skipped', reason: schema.error };
  }

  const where = options.goalIds?.length
    ? {
        companyId: options.companyId,
        id: { in: options.goalIds },
      }
    : {
        companyId: options.companyId,
        notionPageId: null,
      };

  const items = await db.sustainabilityGoal.findMany({
    where,
    include: { department: true },
    take: options.goalIds?.length ? options.goalIds.length : SYNC_BATCH_SIZE,
  });

  const result: SyncResult = {
    total: items.length,
    success: 0,
    failed: 0,
    errors: [],
  };
  const facilityPropertyName = getFacilityPropertyName(schema.properties);
  const titlePropertyName = getTitlePropertyName(schema.properties);

  for (const item of items) {
    const properties = buildGoalNotionProperties(item, schema.properties, facilityPropertyName);

    if (item.notionPageId) {
      const updateResult = await updateNotionPage(apiKey, item.notionPageId, properties);

      if (updateResult.success) {
        await db.sustainabilityGoal.update({
          where: { id: item.id },
          data: {
            notionSyncedAt: new Date(),
            notionSyncStatus: 'updated',
          },
        });
        result.success++;
        continue;
      }

      if (!updateResult.notFound) {
        result.failed++;
        result.errors.push({ id: item.id, error: updateResult.error || 'Notion update failed' });
        continue;
      }

      await db.sustainabilityGoal.update({
        where: { id: item.id },
        data: {
          notionPageId: null,
          notionSyncStatus: 'missing_remote_page',
        },
      });
    }

    const dedupeFilters: NotionFilter[] = [
      {
        property: titlePropertyName,
        title: { equals: sanitize(item.title) },
      },
    ];

    if (schema.properties['Target Year']?.type === 'number') {
      dedupeFilters.push({
        property: 'Target Year',
        number: { equals: item.targetYear },
      });
    }

    if (facilityPropertyName) {
      dedupeFilters.push({
        property: facilityPropertyName,
        rich_text: { equals: sanitize(item.department?.name || 'Company-wide', 100) },
      });
    }

    const existing = await findExistingNotionPage(apiKey, config.databaseIdGoals, {
      and: dedupeFilters,
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

    const createResult = await createNotionPage(apiKey, config.databaseIdGoals, properties);

    if (createResult.success && createResult.pageId) {
      await db.sustainabilityGoal.update({
        where: { id: item.id },
        data: {
          notionPageId: createResult.pageId,
          notionSyncedAt: new Date(),
          notionSyncStatus: 'exported',
        },
      });
      result.success++;
    } else {
      result.failed++;
      result.errors.push({ id: item.id, error: createResult.error || 'Unknown error' });
    }
  }

  return { status: 'completed', result };
}

export async function syncKnowledgeBaseToNotion(options: {
  companyId: string;
  ignoreSyncEnabled?: boolean;
}): Promise<KnowledgeBaseSyncOutcome> {
  const storedConfig = await getCompanyNotionConfig(options.companyId, {
    adoptLegacy: true,
  });
  if (!storedConfig) {
    return { status: 'skipped', reason: 'Notion is not configured' };
  }

  const { config, apiKey } = await getDecryptedNotionApiKey(storedConfig);
  if (!config.syncEnabled && !options.ignoreSyncEnabled) {
    return { status: 'skipped', reason: 'Automatic Notion sync is disabled' };
  }

  if (!apiKey) {
    return { status: 'skipped', reason: 'Missing Notion API key' };
  }

  if (!hasKnowledgeBaseDestination(config)) {
    return {
      status: 'skipped',
      reason: 'Add a Knowledge Base database ID',
    };
  }

  const result: SyncResult = {
    total: NOTION_KNOWLEDGE_BASE_ARTICLES.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  const preparedTargets = new Map<
    string,
    { success: true; prepared: PreparedKnowledgeBaseTarget } | { success: false; error: string }
  >();

  for (const article of NOTION_KNOWLEDGE_BASE_ARTICLES) {
    const configuredTargetId = getKnowledgeBaseTargetId(config);

    if (!configuredTargetId) {
      result.failed++;
      result.errors.push({
        id: article.id,
        error: 'Knowledge Base database is not configured',
      });
      continue;
    }

    let preparedTarget = preparedTargets.get(configuredTargetId);
    if (!preparedTarget) {
      const resolvedTarget = await prepareKnowledgeBaseTarget(apiKey, configuredTargetId);
      preparedTarget = resolvedTarget.success
        ? {
            success: true,
            prepared: {
              target: resolvedTarget.target,
              titlePropertyName: getTitlePropertyName(resolvedTarget.target.schema),
              articleIdPropertyName: findPropertyName(
                resolvedTarget.target.schema,
                ['Article ID', 'Knowledge ID', 'Slug', 'Key'],
                ['rich_text', 'select', 'status']
              ),
            },
          }
        : {
            success: false,
            error: resolvedTarget.error,
          };
      preparedTargets.set(configuredTargetId, preparedTarget);
    }

    if (!preparedTarget.success) {
      result.failed++;
      result.errors.push({
        id: article.id,
        error: preparedTarget.error,
      });
      continue;
    }

    const { prepared } = preparedTarget;
    const properties = buildKnowledgeBaseNotionProperties(article, prepared.target.schema);
    const pageBlocks = buildKnowledgeBasePageBlocks(article.content);

    const existingFilter =
      buildStringEqualsFilter(
        prepared.articleIdPropertyName,
        prepared.articleIdPropertyName
          ? prepared.target.schema[prepared.articleIdPropertyName]
          : undefined,
        article.id,
        120
      ) || {
        property: prepared.titlePropertyName,
        title: { equals: sanitize(article.title, 200) },
      };

    const existing =
      prepared.target.kind === 'database'
        ? await findExistingNotionPage(apiKey, prepared.target.id, existingFilter)
        : await findExistingNotionPageInDataSource(apiKey, prepared.target.id, existingFilter);
    if (!existing.success) {
      result.failed++;
      result.errors.push({
        id: article.id,
        error: existing.error,
      });
      continue;
    }

    if (existing.pageId) {
      const updateResult = await updateNotionPage(apiKey, existing.pageId, properties);
      if (!updateResult.success) {
        result.failed++;
        result.errors.push({
          id: article.id,
          error: updateResult.error || 'Knowledge base page update failed',
        });
        continue;
      }

      const contentResult = await replaceNotionPageContent(apiKey, existing.pageId, pageBlocks);
      if (!contentResult.success) {
        result.failed++;
        result.errors.push({
          id: article.id,
          error: contentResult.error || 'Knowledge base page content update failed',
        });
        continue;
      }

      result.success++;
      continue;
    }

    const createResult =
      prepared.target.kind === 'database'
        ? await createNotionPage(apiKey, prepared.target.id, properties)
        : await createNotionPageInDataSource(apiKey, prepared.target.id, properties);
    if (createResult.success && createResult.pageId) {
      const contentResult = await appendNotionBlockChildren(apiKey, createResult.pageId, pageBlocks);
      if (!contentResult.success) {
        await archiveNotionPage(apiKey, createResult.pageId);
        result.failed++;
        result.errors.push({
          id: article.id,
          error: contentResult.error || 'Knowledge base page content creation failed',
        });
        continue;
      }

      result.success++;
    } else {
      result.failed++;
      result.errors.push({
        id: article.id,
        error: createResult.error || 'Knowledge base page creation failed',
      });
    }
  }

  return { status: 'completed', result };
}

export async function archiveGoalInNotion(options: {
  companyId: string;
  goalId: string;
}): Promise<{ status: 'skipped'; reason: string } | { status: 'completed' }> {
  const storedConfig = await getCompanyNotionConfig(options.companyId, {
    adoptLegacy: true,
  });
  if (!storedConfig) {
    return { status: 'skipped', reason: 'Notion is not configured' };
  }

  const { config, apiKey } = await getDecryptedNotionApiKey(storedConfig);
  if (!config.syncEnabled) {
    return { status: 'skipped', reason: 'Automatic Notion sync is disabled' };
  }

  if (!apiKey) {
    return { status: 'skipped', reason: 'Missing Notion API key' };
  }

  const goal = await db.sustainabilityGoal.findFirst({
    where: {
      id: options.goalId,
      companyId: options.companyId,
    },
    select: {
      id: true,
      notionPageId: true,
    },
  });

  if (!goal?.notionPageId) {
    return { status: 'skipped', reason: 'Goal is not linked to Notion' };
  }

  const archiveResult = await archiveNotionPage(apiKey, goal.notionPageId);
  if (!archiveResult.success && !archiveResult.notFound) {
    return {
      status: 'skipped',
      reason: archiveResult.error || 'Failed to archive linked Notion goal',
    };
  }

  return { status: 'completed' };
}
