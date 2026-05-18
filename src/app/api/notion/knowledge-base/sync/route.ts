import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import {
  getCompanyNotionConfig,
  getDecryptedNotionApiKey,
  hasAnyKnowledgeBaseDatabase,
} from '@/lib/server/notion-config';
import {
  NOTION_KNOWLEDGE_BASE_ARTICLE_COUNT,
  NOTION_KNOWLEDGE_BASE_VERSION,
  humanizeKnowledgeBaseSyncError,
  recordKnowledgeBaseSyncAudit,
} from '@/lib/server/notion-knowledge-base-health';
import { syncKnowledgeBaseToNotion } from '@/lib/server/notion-sync';

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
    const storedConfig = await getCompanyNotionConfig(auth.session.companyId, {
      adoptLegacy: true,
    });

    if (!storedConfig) {
      return NextResponse.json(
        { success: false, error: 'Notion is not configured for this workspace yet.' },
        { status: 400 }
      );
    }

    const { config, apiKey } = await getDecryptedNotionApiKey(storedConfig);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Add a Notion API key before refreshing the knowledge base.' },
        { status: 400 }
      );
    }

    if (!hasAnyKnowledgeBaseDatabase(config)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Add a Knowledge Base database before running the dedicated knowledge sync.',
        },
        { status: 400 }
      );
    }

    const syncResult = await syncKnowledgeBaseToNotion({
      companyId: auth.session.companyId,
      ignoreSyncEnabled: true,
    });

    if (syncResult.status !== 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: humanizeKnowledgeBaseSyncError(syncResult.reason),
        },
        { status: 400 }
      );
    }

    await recordKnowledgeBaseSyncAudit(auth.session, syncResult.result, 'manual');

    return NextResponse.json({
      success: syncResult.result.failed === 0,
      syncedItems: syncResult.result.success,
      failedItems: syncResult.result.failed,
      totalItems: syncResult.result.total,
      articleCount: NOTION_KNOWLEDGE_BASE_ARTICLE_COUNT,
      knowledgeBaseVersion: NOTION_KNOWLEDGE_BASE_VERSION,
      errors: syncResult.result.errors.map((entry) => humanizeKnowledgeBaseSyncError(entry.error)),
      message:
        syncResult.result.failed === 0
          ? 'Knowledge Base synced to the mapped Notion database.'
          : 'Knowledge Base sync completed with some article-level issues.',
    });
  } catch (error) {
    console.error('Error syncing Notion knowledge base:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync the Knowledge Base to Notion.',
      },
      { status: 500 }
    );
  }
}
