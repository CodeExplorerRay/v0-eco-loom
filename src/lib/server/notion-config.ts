import type { NotionConfig } from '@prisma/client';
import { db } from '@/lib/db';
import { decryptSecret, encryptSecret, isEncryptedSecret } from '@/lib/server/secrets';
type CompanyNotionConfigOptions = {
  createIfMissing?: boolean;
  adoptLegacy?: boolean;
};

export function maskApiKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.length <= 10) {
    return '•'.repeat(value.length);
  }

  return `${value.slice(0, 7)}${'•'.repeat(Math.max(8, value.length - 10))}${value.slice(-3)}`;
}

export function maskDatabaseId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.length <= 8) {
    return '•'.repeat(value.length);
  }

  return `${value.slice(0, 4)}${'•'.repeat(Math.max(8, value.length - 8))}${value.slice(-4)}`;
}

export async function ensureEncryptedNotionApiKey(config: NotionConfig) {
  if (!config.apiKey || isEncryptedSecret(config.apiKey)) {
    return config;
  }

  return db.notionConfig.update({
    where: { id: config.id },
    data: { apiKey: encryptSecret(config.apiKey) },
  });
}

function formatUuid(value: string) {
  const compact = value.replace(/-/g, '').toLowerCase();
  if (compact.length !== 32) {
    return value;
  }

  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

export function normalizeNotionDatabaseId(value: string | null | undefined) {
  if (!value) {
    return value ?? null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('•')) {
    return trimmed;
  }

  const hyphenatedMatch = trimmed.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
  );
  if (hyphenatedMatch) {
    return hyphenatedMatch[0].toLowerCase();
  }

  const compactMatch = trimmed.match(/[0-9a-fA-F]{32}/);
  if (compactMatch) {
    return formatUuid(compactMatch[0]);
  }

  return trimmed;
}

export function getNotionImportCursor(config: Pick<NotionConfig, 'lastSyncAt'>) {
  return config.lastSyncAt ?? null;
}

export async function markNotionPullSynced(
  config: Pick<NotionConfig, 'id' | 'lastSyncAt'>,
  at: Date = new Date()
) {
  return db.notionConfig.update({
    where: { id: config.id },
    data: {
      lastSyncAt: at,
    },
  });
}

async function ensureNormalizedNotionDatabaseIds(config: NotionConfig) {
  const normalizedLedger = normalizeNotionDatabaseId(config.databaseIdLedger);
  const normalizedGoals = normalizeNotionDatabaseId(config.databaseIdGoals);
  const normalizedReports = normalizeNotionDatabaseId(config.databaseIdReports);
  const normalizedDepts = normalizeNotionDatabaseId(config.databaseIdDepts);
  const normalizedKnowledgeBase = normalizeNotionDatabaseId(config.databaseIdKnowledgeBase);
  const updates: Partial<NotionConfig> = {};

  if (normalizedLedger !== config.databaseIdLedger) {
    updates.databaseIdLedger = normalizedLedger;
  }
  if (normalizedGoals !== config.databaseIdGoals) {
    updates.databaseIdGoals = normalizedGoals;
  }
  if (normalizedReports !== config.databaseIdReports) {
    updates.databaseIdReports = normalizedReports;
  }
  if (normalizedDepts !== config.databaseIdDepts) {
    updates.databaseIdDepts = normalizedDepts;
  }
  if (normalizedKnowledgeBase !== config.databaseIdKnowledgeBase) {
    updates.databaseIdKnowledgeBase = normalizedKnowledgeBase;
  }

  if (Object.keys(updates).length === 0) {
    return config;
  }

  return db.notionConfig.update({
    where: { id: config.id },
    data: updates,
  });
}

async function normalizeStoredNotionConfig(config: NotionConfig) {
  const normalizedIds = await ensureNormalizedNotionDatabaseIds(config);
  return ensureEncryptedNotionApiKey(normalizedIds);
}

export async function getCompanyNotionConfig(
  companyId: string,
  options: CompanyNotionConfigOptions = {}
) {
  const { createIfMissing = false, adoptLegacy = true } = options;

  const companyConfig = await db.notionConfig.findUnique({
    where: { companyId },
  });

  if (companyConfig) {
    return normalizeStoredNotionConfig(companyConfig);
  }

  if (adoptLegacy) {
    const legacyConfig = await db.notionConfig.findFirst({
      where: { companyId: null },
      orderBy: [{ createdAt: 'asc' }, { updatedAt: 'asc' }],
    });

    if (legacyConfig) {
      const adoptedConfig = await db.notionConfig.update({
        where: { id: legacyConfig.id },
        data: { companyId },
      });

      return normalizeStoredNotionConfig(adoptedConfig);
    }
  }

  if (createIfMissing) {
    return db.notionConfig.upsert({
      where: { companyId },
      update: {},
      create: {
        companyId,
        syncEnabled: true,
      },
    });
  }

  return null;
}

export function getNotionDatabaseCoverage(config: Pick<
  NotionConfig,
  | 'databaseIdLedger'
  | 'databaseIdGoals'
  | 'databaseIdReports'
  | 'databaseIdDepts'
  | 'databaseIdKnowledgeBase'
>) {
  return {
    ledgerConfigured: Boolean(config.databaseIdLedger),
    goalsConfigured: Boolean(config.databaseIdGoals),
    reportsConfigured: Boolean(config.databaseIdReports),
    facilitiesConfigured: Boolean(config.databaseIdDepts),
    knowledgeBaseConfigured: Boolean(config.databaseIdKnowledgeBase),
  };
}

export function countMappedNotionDatabases(config: Pick<
  NotionConfig,
  | 'databaseIdLedger'
  | 'databaseIdGoals'
  | 'databaseIdReports'
  | 'databaseIdDepts'
  | 'databaseIdKnowledgeBase'
>) {
  return [
    config.databaseIdLedger,
    config.databaseIdGoals,
    config.databaseIdReports,
    config.databaseIdDepts,
    config.databaseIdKnowledgeBase,
  ].filter(Boolean).length;
}

export function countMappedCoreNotionDatabases(config: Pick<
  NotionConfig,
  | 'databaseIdLedger'
  | 'databaseIdGoals'
  | 'databaseIdReports'
  | 'databaseIdDepts'
  | 'databaseIdKnowledgeBase'
>) {
  const coverage = getNotionDatabaseCoverage(config);

  return [
    coverage.ledgerConfigured,
    coverage.goalsConfigured,
    coverage.reportsConfigured,
    coverage.facilitiesConfigured,
    coverage.knowledgeBaseConfigured,
  ].filter(Boolean).length;
}

export function hasAnyMappedNotionDatabase(config: Pick<
  NotionConfig,
  | 'databaseIdLedger'
  | 'databaseIdGoals'
  | 'databaseIdReports'
  | 'databaseIdDepts'
  | 'databaseIdKnowledgeBase'
>) {
  return countMappedNotionDatabases(config) > 0;
}

export function hasAnyKnowledgeBaseDatabase(config: Pick<
  NotionConfig,
  'databaseIdKnowledgeBase'
>) {
  return Boolean(config.databaseIdKnowledgeBase);
}

export async function getSanitizedNotionConfig(config: NotionConfig) {
  const normalized = await normalizeStoredNotionConfig(config);
  const apiKey = decryptSecret(normalized.apiKey);

  return {
    ...normalized,
    apiKey: maskApiKey(apiKey),
    databaseIdLedger: maskDatabaseId(normalized.databaseIdLedger),
    databaseIdGoals: maskDatabaseId(normalized.databaseIdGoals),
    databaseIdReports: maskDatabaseId(normalized.databaseIdReports),
    databaseIdDepts: maskDatabaseId(normalized.databaseIdDepts),
    databaseIdKnowledgeBase: maskDatabaseId(normalized.databaseIdKnowledgeBase),
  };
}

export async function getDecryptedNotionApiKey(config: NotionConfig) {
  const normalized = await normalizeStoredNotionConfig(config);
  return {
    config: normalized,
    apiKey: decryptSecret(normalized.apiKey),
  };
}
