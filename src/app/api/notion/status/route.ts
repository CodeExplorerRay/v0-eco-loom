import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/server/auth';
import {
  countMappedCoreNotionDatabases,
  countMappedNotionDatabases,
  getCompanyNotionConfig,
  getNotionDatabaseCoverage,
} from '@/lib/server/notion-config';
import { getKnowledgeBaseSyncHealth } from '@/lib/server/notion-knowledge-base-health';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const config = await getCompanyNotionConfig(auth.session.companyId, {
      adoptLegacy: true,
    });

    if (!config) {
      return NextResponse.json({
        configured: false,
        syncEnabled: false,
        ledgerConfigured: false,
        goalsConfigured: false,
        reportsConfigured: false,
        facilitiesConfigured: false,
        knowledgeBaseConfigured: false,
        knowledgeBaseHealth: 'not_mapped',
        knowledgeBaseHealthMessage:
          'Add a Knowledge Base database to publish Eco-Loom help content into Notion.',
        knowledgeBaseLastSyncedAt: null,
        knowledgeBaseLastTrigger: null,
        knowledgeBaseLastDeploymentId: null,
        knowledgeBaseArticleCount: 0,
        knowledgeBaseVersion: null,
        coreMappedDatabaseCount: 0,
        mappedDatabaseCount: 0,
        workspaceName: null,
        lastSyncAt: null,
      });
    }

    const coverage = getNotionDatabaseCoverage(config);
      const knowledgeBaseHealth = await getKnowledgeBaseSyncHealth(
        auth.session.companyId,
        coverage.knowledgeBaseConfigured
      );
      return NextResponse.json({
        configured: Boolean(config.apiKey),
      syncEnabled: config.syncEnabled,
      ...coverage,
      knowledgeBaseHealth: knowledgeBaseHealth.state,
      knowledgeBaseHealthMessage: knowledgeBaseHealth.message,
      knowledgeBaseLastSyncedAt: knowledgeBaseHealth.lastSyncedAt,
      knowledgeBaseLastTrigger: knowledgeBaseHealth.lastTrigger,
      knowledgeBaseLastDeploymentId: knowledgeBaseHealth.lastDeploymentId,
      knowledgeBaseArticleCount: knowledgeBaseHealth.articleCount,
      knowledgeBaseVersion: knowledgeBaseHealth.version,
        coreMappedDatabaseCount: countMappedCoreNotionDatabases(config),
        mappedDatabaseCount: countMappedNotionDatabases(config),
        workspaceName: config.workspaceName ?? null,
        lastSyncAt: config.lastSyncAt,
      });
  } catch (error) {
    console.error('Error fetching Notion status:', error);
    return NextResponse.json({ error: 'Failed to fetch Notion status' }, { status: 500 });
  }
}
