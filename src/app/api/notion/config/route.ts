import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encryptSecret } from '@/lib/server/secrets';
import {
  getCompanyNotionConfig,
  getDecryptedNotionApiKey,
  getSanitizedNotionConfig,
  normalizeNotionDatabaseId,
} from '@/lib/server/notion-config';
import { requireApiSession } from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';
import { enforceRateLimit } from '@/lib/server/rate-limit';

async function fetchWorkspaceName(apiKey: string) {
  try {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const responseData = (await response.json()) as {
      bot?: { workspace_name?: string | null };
      name?: string | null;
    };

    return responseData.bot?.workspace_name || responseData.name || null;
  } catch {
    return null;
  }
}

// GET - Fetch Notion configuration
export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const config = await getCompanyNotionConfig(auth.session.companyId, {
      createIfMissing: true,
      adoptLegacy: true,
    });

    if (!config) {
      return NextResponse.json({ error: 'Failed to initialize configuration' }, { status: 500 });
    }
    
    return NextResponse.json(await getSanitizedNotionConfig(config));
  } catch (error) {
    console.error('Error fetching Notion config:', error);
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
  }
}

// POST - Save or test Notion configuration
export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { 
      apiKey, 
      databaseIdLedger, 
      databaseIdGoals, 
      databaseIdReports, 
      databaseIdDepts,
      databaseIdKnowledgeBase,
      testOnly 
    } = body;
    const submittedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
    const hasMaskedApiKey = submittedApiKey.includes('•');
    const submittedLedgerId = typeof databaseIdLedger === 'string' ? databaseIdLedger.trim() : '';
    const submittedGoalsId = typeof databaseIdGoals === 'string' ? databaseIdGoals.trim() : '';
    const submittedReportsId = typeof databaseIdReports === 'string' ? databaseIdReports.trim() : '';
    const submittedDeptsId = typeof databaseIdDepts === 'string' ? databaseIdDepts.trim() : '';
    const submittedKnowledgeBaseId =
      typeof databaseIdKnowledgeBase === 'string' ? databaseIdKnowledgeBase.trim() : '';

    const resolveDatabaseId = (submittedValue: string, existingValue: string | null) => {
      if (!submittedValue || submittedValue.includes('•')) {
        return existingValue;
      }

      return normalizeNotionDatabaseId(submittedValue);
    };

    // Test connection if requested
    if (testOnly) {
      if (!submittedApiKey || hasMaskedApiKey) {
        return NextResponse.json(
          { success: false, error: 'Enter a valid Notion API key to test the connection.' },
          { status: 400 }
        );
      }

      try {
        const response = await fetch('https://api.notion.com/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${submittedApiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
        });

        const responseData = await response.json();

        if (!response.ok) {
          const errorMessage = responseData.message || responseData.code || 'Invalid API key or insufficient permissions';
          console.error('[Notion Test] Failed:', errorMessage);
          return NextResponse.json({ 
            success: false, 
            error: errorMessage,
            details: responseData
          }, { status: 400 });
        }

        return NextResponse.json({ 
          success: true, 
          message: `Connected as ${responseData.name || 'Integration'}`,
          workspaceName: responseData.bot?.workspace_name || 'Connected'
        });
      } catch (error) {
        console.error('[Notion Test] Network error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ 
          success: false, 
          error: `Network error: ${errorMessage}. Please check your internet connection.` 
        }, { status: 400 });
      }
    }

    // Save configuration
    const normalizedExistingConfig = await getCompanyNotionConfig(auth.session.companyId, {
      createIfMissing: true,
      adoptLegacy: true,
    });

    if (!normalizedExistingConfig) {
      return NextResponse.json({ error: 'Failed to initialize configuration' }, { status: 500 });
    }

    const existingApiKey = (
      await getDecryptedNotionApiKey(normalizedExistingConfig)
    ).apiKey;
    const apiKeyForWorkspace =
      submittedApiKey && !hasMaskedApiKey ? submittedApiKey : existingApiKey;
    const workspaceName =
      (apiKeyForWorkspace ? await fetchWorkspaceName(apiKeyForWorkspace) : null) ??
      normalizedExistingConfig.workspaceName;
    
    const config = await db.notionConfig.update({
      where: { id: normalizedExistingConfig.id },
      data: {
        apiKey:
          submittedApiKey && !hasMaskedApiKey
            ? encryptSecret(submittedApiKey)
            : normalizedExistingConfig.apiKey,
        databaseIdLedger: resolveDatabaseId(
          submittedLedgerId,
          normalizedExistingConfig.databaseIdLedger
        ),
        databaseIdGoals: resolveDatabaseId(
          submittedGoalsId,
          normalizedExistingConfig.databaseIdGoals
        ),
        databaseIdReports: resolveDatabaseId(
          submittedReportsId,
          normalizedExistingConfig.databaseIdReports
        ),
        databaseIdDepts: resolveDatabaseId(
          submittedDeptsId,
          normalizedExistingConfig.databaseIdDepts
        ),
        databaseIdKnowledgeBase: resolveDatabaseId(
          submittedKnowledgeBaseId,
          normalizedExistingConfig.databaseIdKnowledgeBase
        ),
        workspaceName,
      },
    });

    await createAuditLog(auth.session, {
      action: 'update',
      entityType: 'notion_config',
      entityId: config.id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        action: 'configuration_saved',
      }),
    });

    return NextResponse.json({
      config: await getSanitizedNotionConfig(config),
    });
  } catch (error) {
    console.error('Error saving Notion config:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}

// PATCH - Update specific fields
export async function PATCH(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { syncEnabled } = body;

    const existingConfig = await getCompanyNotionConfig(auth.session.companyId, {
      adoptLegacy: true,
    });
    
    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const config = await db.notionConfig.update({
      where: { id: existingConfig.id },
      data: { syncEnabled },
    });

    return NextResponse.json(await getSanitizedNotionConfig(config));
  } catch (error) {
    console.error('Error updating Notion config:', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}
