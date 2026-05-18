import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { NOTION_KNOWLEDGE_BASE_ARTICLES } from '@/lib/notion/notion-knowledge-base';
import { createAuditLog } from '@/lib/server/audit';
import type { ApiSession } from '@/lib/server/auth';

export const KNOWLEDGE_BASE_AUDIT_ENTITY_TYPE = 'notion_knowledge_base';
export const NOTION_KNOWLEDGE_BASE_ARTICLE_COUNT = NOTION_KNOWLEDGE_BASE_ARTICLES.length;
export const NOTION_KNOWLEDGE_BASE_VERSION = createHash('sha256')
  .update(
    JSON.stringify(
      NOTION_KNOWLEDGE_BASE_ARTICLES.map((article) => ({
        id: article.id,
        title: article.title,
        category: article.category,
        audience: article.audience,
        summary: article.summary,
        content: article.content,
      }))
    )
  )
  .digest('hex')
  .slice(0, 16);

export type KnowledgeBaseHealthState =
  | 'not_mapped'
  | 'needs_first_sync'
  | 'update_available'
  | 'current'
  | 'failed';

type KnowledgeBaseSyncResultLike = {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
};

type KnowledgeBaseAuditDetails = {
  success?: boolean;
  syncedItems?: number;
  failedItems?: number;
  totalItems?: number;
  trigger?: string;
  knowledgeBaseVersion?: string;
  articleCount?: number;
  deploymentId?: string | null;
  errorSummary?: string | null;
};

export interface KnowledgeBaseSyncHealth {
  state: KnowledgeBaseHealthState;
  message: string;
  mapped: boolean;
  articleCount: number;
  version: string;
  lastSyncedAt: string | null;
  lastTrigger: string | null;
  lastDeploymentId: string | null;
  lastSyncSuccess: boolean | null;
}

export function humanizeKnowledgeBaseSyncError(error: string | null | undefined) {
  if (!error) {
    return 'Knowledge Base refresh needs attention.';
  }

  const destinationPrefix = error.includes(' destination:') ? error.split(' destination:')[0] : null;
  const withDestination = (message: string) =>
    destinationPrefix ? `${destinationPrefix}: ${message}` : message;

  if (error === 'Database not found' || error.includes('Database not found')) {
    return withDestination(
      'Knowledge Base database could not be found. Paste the database ID or full Notion database URL, then share that database with your Notion integration.'
    );
  }

  if (
    error === 'Database not shared with integration' ||
    error.includes('Database not shared with integration')
  ) {
    return withDestination(
      'Knowledge Base database is not shared with the Notion integration yet. Share the database with the integration and try again.'
    );
  }

  if (error === 'Invalid API key' || error.includes('Invalid API key')) {
    return withDestination(
      'The Notion API key is not valid for this workspace. Update the integration token and try again.'
    );
  }

  if (
    error === 'No child data source found for this database' ||
    error.includes('No child data source found for this database')
  ) {
    return withDestination(
      'Knowledge Base database is reachable, but Notion did not return a writable child data source. Open the database once in Notion, confirm it is a standard database, and try saving the mapping again.'
    );
  }

  return error;
}

function getKnowledgeBaseDeploymentId() {
  return (
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_URL ||
    null
  );
}

function buildCompanyScopeClause(companyId: string): Prisma.AuditLogWhereInput {
  return {
    OR: [
      {
        user: {
          is: {
            companyId,
          },
        },
      },
      {
        details: {
          contains: `"companyId":"${companyId}"`,
        },
      },
      {
        entityType: KNOWLEDGE_BASE_AUDIT_ENTITY_TYPE,
        entityId: companyId,
      },
    ],
  };
}

function parseKnowledgeBaseAuditDetails(details?: string | null): KnowledgeBaseAuditDetails | null {
  if (!details) {
    return null;
  }

  try {
    const parsed = JSON.parse(details) as KnowledgeBaseAuditDetails;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function recordKnowledgeBaseSyncAudit(
  session: ApiSession,
  result: KnowledgeBaseSyncResultLike,
  trigger: 'manual' | 'config_save' | 'sync_to_notion' | 'status_check'
) {
  const success = result.failed === 0;

  await createAuditLog(session, {
    action: 'sync',
    entityType: KNOWLEDGE_BASE_AUDIT_ENTITY_TYPE,
    entityId: session.companyId,
    details: JSON.stringify({
      success,
      syncedItems: result.success,
      failedItems: result.failed,
      totalItems: result.total,
      trigger,
      knowledgeBaseVersion: NOTION_KNOWLEDGE_BASE_VERSION,
      articleCount: NOTION_KNOWLEDGE_BASE_ARTICLE_COUNT,
      deploymentId: getKnowledgeBaseDeploymentId(),
      errorSummary: success
        ? null
        : result.errors
            .slice(0, 3)
            .map((entry) => humanizeKnowledgeBaseSyncError(entry.error))
            .join(' | '),
    }),
  });
}

export async function getKnowledgeBaseSyncHealth(
  companyId: string,
  mapped: boolean
): Promise<KnowledgeBaseSyncHealth> {
  if (!mapped) {
    return {
      state: 'not_mapped',
      message: 'Add a Knowledge Base database to publish Eco-Loom help content into Notion.',
      mapped: false,
      articleCount: NOTION_KNOWLEDGE_BASE_ARTICLE_COUNT,
      version: NOTION_KNOWLEDGE_BASE_VERSION,
      lastSyncedAt: null,
      lastTrigger: null,
      lastDeploymentId: null,
      lastSyncSuccess: null,
    };
  }

  const latestSync = await db.auditLog.findFirst({
    where: {
      AND: [
        buildCompanyScopeClause(companyId),
        {
          entityType: KNOWLEDGE_BASE_AUDIT_ENTITY_TYPE,
          action: 'sync',
        },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!latestSync) {
    return {
      state: 'needs_first_sync',
      message:
        'Knowledge Base mapping is ready, but Eco-Loom has not published the articles to Notion yet.',
      mapped: true,
      articleCount: NOTION_KNOWLEDGE_BASE_ARTICLE_COUNT,
      version: NOTION_KNOWLEDGE_BASE_VERSION,
      lastSyncedAt: null,
      lastTrigger: null,
      lastDeploymentId: null,
      lastSyncSuccess: null,
    };
  }

  const details = parseKnowledgeBaseAuditDetails(latestSync.details);
  const lastSyncSuccess = typeof details?.success === 'boolean' ? details.success : true;
  const lastVersion = details?.knowledgeBaseVersion || null;

  if (!lastSyncSuccess) {
    return {
      state: 'failed',
      message:
        humanizeKnowledgeBaseSyncError(details?.errorSummary) ||
        'The last Knowledge Base refresh ran into issues. Run the dedicated sync again after reviewing the mapping.',
      mapped: true,
      articleCount: NOTION_KNOWLEDGE_BASE_ARTICLE_COUNT,
      version: NOTION_KNOWLEDGE_BASE_VERSION,
      lastSyncedAt: latestSync.createdAt.toISOString(),
      lastTrigger: details?.trigger || null,
      lastDeploymentId: details?.deploymentId || null,
      lastSyncSuccess,
    };
  }

  if (lastVersion !== NOTION_KNOWLEDGE_BASE_VERSION) {
    return {
      state: 'update_available',
      message:
        'Eco-Loom knowledge articles changed since the last Notion refresh. Run the dedicated Knowledge Base sync to bring Notion up to date.',
      mapped: true,
      articleCount: NOTION_KNOWLEDGE_BASE_ARTICLE_COUNT,
      version: NOTION_KNOWLEDGE_BASE_VERSION,
      lastSyncedAt: latestSync.createdAt.toISOString(),
      lastTrigger: details?.trigger || null,
      lastDeploymentId: details?.deploymentId || null,
      lastSyncSuccess,
    };
  }

  return {
      state: 'current',
      message: 'Notion is current with the published Eco-Loom knowledge articles in the mapped Knowledge Base database.',
      mapped: true,
    articleCount: NOTION_KNOWLEDGE_BASE_ARTICLE_COUNT,
    version: NOTION_KNOWLEDGE_BASE_VERSION,
    lastSyncedAt: latestSync.createdAt.toISOString(),
    lastTrigger: details?.trigger || null,
    lastDeploymentId: details?.deploymentId || null,
    lastSyncSuccess,
  };
}
