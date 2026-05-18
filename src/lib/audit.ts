import type { AuditCenterFilters, AuditFeature, AuditLogEntry } from '@/lib/types';

type AuditFeatureOption = {
  value: AuditFeature;
  label: string;
};

type AuditActionOption = {
  value: string;
  label: string;
};

const FEATURE_ENTITY_TYPES: Record<AuditFeature, string[]> = {
  ledger: ['carbon_ledger_entry', 'carbon_entry'],
  goals: ['goal', 'sustainability_goal'],
  reports: ['report'],
  notion: ['notion', 'notion_config', 'notion_knowledge_base'],
  users: ['user'],
  ingest: ['file', 'ingest_job'],
  facilities: ['department'],
  automation: ['agent_task'],
  system: ['database'],
};

const FEATURE_LABELS: Record<AuditFeature, string> = {
  ledger: 'Carbon Ledger',
  goals: 'Goals',
  reports: 'Reports',
  notion: 'Notion MCP',
  users: 'Users',
  ingest: 'Data Ingest',
  facilities: 'Facilities',
  automation: 'Automation',
  system: 'System',
};

const FEATURE_BADGE_CLASSES: Record<AuditFeature, string> = {
  ledger: 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
  goals: 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300',
  reports: 'border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300',
  notion: 'border-fuchsia-200 text-fuchsia-700 dark:border-fuchsia-800 dark:text-fuchsia-300',
  users: 'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300',
  ingest: 'border-cyan-200 text-cyan-700 dark:border-cyan-800 dark:text-cyan-300',
  facilities: 'border-lime-200 text-lime-700 dark:border-lime-800 dark:text-lime-300',
  automation: 'border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300',
  system: 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300',
};

const ENTITY_LABELS: Record<string, string> = {
  carbon_ledger_entry: 'Ledger Entry',
  carbon_entry: 'Ledger Entry',
  goal: 'Goal',
  sustainability_goal: 'Goal',
  report: 'Report',
  notion: 'Notion Sync',
  notion_knowledge_base: 'Knowledge Base',
  notion_config: 'Notion Config',
  user: 'User',
  file: 'Upload',
  ingest_job: 'Ingest Job',
  department: 'Facility / Site',
  agent_task: 'Automation Task',
  database: 'System',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  calculate: 'Calculated',
  verify: 'Verified',
  factor_applied: 'Factor Applied',
  factor_recalculated: 'Factor Recalculated',
  factor_override: 'Factor Override',
  publish: 'Published',
  sync: 'Synced',
  upload: 'Uploaded',
  import: 'Imported',
  import_failed: 'Import Failed',
  rotate_access_token: 'Rotated Token',
  seed: 'Seeded',
};

export const DEFAULT_AUDIT_FILTERS: AuditCenterFilters = {
  search: '',
  feature: 'all',
  action: 'all',
  actor: '',
  dateFrom: '',
  dateTo: '',
  entityType: '',
  entityId: '',
};

export const AUDIT_FEATURE_OPTIONS: Array<{ value: 'all' | AuditFeature; label: string }> = [
  { value: 'all', label: 'All Features' },
  ...Object.entries(FEATURE_LABELS).map(([value, label]) => ({
    value: value as AuditFeature,
    label,
  })),
];

export const AUDIT_ACTION_OPTIONS: AuditActionOption[] = [
  { value: 'all', label: 'All Actions' },
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
  { value: 'calculate', label: 'Calculated' },
  { value: 'verify', label: 'Verified' },
  { value: 'factor_applied', label: 'Factor Applied' },
  { value: 'factor_recalculated', label: 'Factor Recalculated' },
  { value: 'factor_override', label: 'Factor Override' },
  { value: 'publish', label: 'Published' },
  { value: 'sync', label: 'Synced' },
  { value: 'upload', label: 'Uploaded' },
  { value: 'import', label: 'Imported' },
  { value: 'import_failed', label: 'Import Failed' },
  { value: 'rotate_access_token', label: 'Rotated Token' },
  { value: 'seed', label: 'Seeded' },
];

export function getAuditFeature(entityType: string): AuditFeature {
  const match = (Object.entries(FEATURE_ENTITY_TYPES) as [AuditFeature, string[]][])
    .find(([, entityTypes]) => entityTypes.includes(entityType));
  return match?.[0] || 'system';
}

export function getEntityTypesForFeature(feature: string | null | undefined) {
  if (!feature || feature === 'all') {
    return null;
  }

  return FEATURE_ENTITY_TYPES[feature as AuditFeature] ?? null;
}

export function getAuditFeatureLabel(feature: AuditFeature) {
  return FEATURE_LABELS[feature];
}

export function getAuditFeatureBadgeClass(feature: AuditFeature) {
  return FEATURE_BADGE_CLASSES[feature];
}

export function getAuditEntityLabel(entityType: string) {
  return ENTITY_LABELS[entityType] || entityType.replace(/_/g, ' ');
}

export function formatAuditAction(action: string) {
  return ACTION_LABELS[action] || action;
}

export function parseAuditDetails(details?: string | null) {
  if (!details) {
    return null;
  }

  try {
    return JSON.parse(details) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function sanitizeAuditDetailsForDisplay(details: Record<string, unknown> | null) {
  if (!details) {
    return null;
  }

  const hiddenKeys = new Set(['companyId', 'actorId', 'actorName', 'actorEmail']);
  const visibleEntries = Object.entries(details).filter(([key]) => !hiddenKeys.has(key));
  if (visibleEntries.length === 0) {
    return null;
  }

  return Object.fromEntries(visibleEntries);
}

export function getStringDetail(details: Record<string, unknown> | null, key: string) {
  const value = details?.[key];
  return typeof value === 'string' ? value : null;
}

export function getAuditActor(log: Pick<AuditLogEntry, 'user' | 'details'>) {
  const details = parseAuditDetails(log.details);
  return (
    log.user?.name ||
    log.user?.email ||
    getStringDetail(details, 'verifiedBy') ||
    getStringDetail(details, 'actor') ||
    'System'
  );
}

export function getAuditSummary(log: Pick<AuditLogEntry, 'action' | 'entityType' | 'details'>) {
  const details = parseAuditDetails(log.details);

  if (log.action === 'update') {
    const taskAction = getStringDetail(details, 'taskAction');
    const taskType = getStringDetail(details, 'taskType');
    if (log.entityType === 'agent_task' && taskAction === 'retry') {
      return taskType
        ? `Queued ${taskType.replace(/_/g, ' ')} for another run.`
        : 'Queued this automation task for another run.';
    }
    if (log.entityType === 'agent_task' && taskAction === 'reschedule') {
      const scheduledAt = getStringDetail(details, 'scheduledAt');
      return scheduledAt
        ? `Rescheduled this automation task for ${new Date(scheduledAt).toLocaleString()}.`
        : 'Rescheduled this automation task.';
    }

    const changes = details?.changes;
    if (changes && typeof changes === 'object') {
      const changedFields = Object.keys(changes as Record<string, unknown>);
      if (changedFields.length > 0) {
        return `Updated ${changedFields.join(', ')}.`;
      }
    }
  }

  if (log.action === 'verify') {
    return 'Verified the entry and locked standard-user edits.';
  }

  if (log.action === 'factor_applied') {
    const source = getStringDetail(details, 'factorSource');
    const year = getStringDetail(details, 'factorYear');
    return source && year
      ? `Applied approved factor from ${source} (${year}).`
      : 'Applied an approved emission factor.';
  }

  if (log.action === 'factor_recalculated') {
    const source = getStringDetail(details, 'factorSource');
    const year = getStringDetail(details, 'factorYear');
    return source && year
      ? `Recalculated this entry using ${source} (${year}).`
      : 'Recalculated this entry with the approved factor library.';
  }

  if (log.action === 'factor_override') {
    const source = getStringDetail(details, 'factorSource');
    const reason = getStringDetail(details, 'reason');
    if (source && reason) {
      return `Applied custom factor from ${source}. Reason: ${reason}`;
    }
    if (reason) {
      return `Applied a custom factor override. Reason: ${reason}`;
    }
    return 'Applied a custom factor override.';
  }

  if (log.action === 'calculate') {
    const taskType = getStringDetail(details, 'taskType');
    if (taskType === 'recalculate_goal_progress') {
      const updatedGoals = details?.updatedGoals;
      if (typeof updatedGoals === 'number') {
        return `Recalculated progress for ${updatedGoals} goal${updatedGoals === 1 ? '' : 's'}.`;
      }
      return 'Recalculated sustainability-goal progress.';
    }

    if (taskType === 'classify_ledger_entry') {
      return 'Refreshed ledger-entry classification metadata.';
    }

    return 'Completed a calculation or refresh step.';
  }

  if (log.action === 'publish') {
    return 'Published this report for stakeholder review.';
  }

  if (log.action === 'upload') {
    const ingestType = getStringDetail(details, 'ingestType');
    if (ingestType === 'evidence_upload') {
      return 'Uploaded a new evidence file for review.';
    }
    return 'Uploaded a new source document for ingestion.';
  }

  if (log.action === 'import') {
    const createdEntries = details?.createdEntries;
    if (typeof createdEntries === 'number') {
      return `Imported ${createdEntries} ledger entr${createdEntries === 1 ? 'y' : 'ies'} from CSV.`;
    }
    return 'Imported ledger entries from CSV.';
  }

  if (log.action === 'import_failed') {
    return 'CSV import failed before valid ledger entries could be completed.';
  }

  if (log.action === 'rotate_access_token') {
    return 'Rotated the user access token.';
  }

  if (log.action === 'sync') {
    if (log.entityType === 'notion_knowledge_base') {
      const success = details?.success;
      if (success === false) {
        return 'Knowledge base refresh needs attention before Notion is fully current.';
      }

      const trigger = getStringDetail(details, 'trigger');
      if (trigger === 'config_save') {
        return 'Refreshed the Notion knowledge base after saving the integration settings.';
      }
      if (trigger === 'status_check') {
        return 'Refreshed the Notion knowledge base because Eco-Loom detected a newer article set.';
      }
      return 'Published the latest Eco-Loom knowledge base articles into Notion.';
    }

    const direction = getStringDetail(details, 'direction');
    if (direction === 'from_notion') {
      return 'Imported updates from Notion into Eco-Loom.';
    }
    if (direction === 'to_notion') {
      return 'Pushed updates from Eco-Loom into Notion.';
    }
    return 'Completed a synchronization run.';
  }

  if (log.action === 'seed') {
    return 'Seeded workspace demo data.';
  }

  if (log.action === 'create') {
    if (log.entityType === 'carbon_ledger_entry') {
      const sourceType = getStringDetail(details, 'sourceType');
      return sourceType
        ? `Created a ${sourceType} ledger entry.`
        : 'Created this ledger entry.';
    }

    if (log.entityType === 'report') {
      return 'Generated a new report draft.';
    }

    if (log.entityType === 'user') {
      return 'Created a new workspace user.';
    }

    if (log.entityType === 'department') {
      return 'Created a new facility / site.';
    }

    if (log.entityType === 'goal' || log.entityType === 'sustainability_goal') {
      return 'Created a sustainability goal.';
    }
  }

  if (log.action === 'delete') {
    if (log.entityType === 'department') {
      const deletedLedgerEntries = details?.deletedLedgerEntries;
      const deletedGoals = details?.deletedGoals;
      if (typeof deletedLedgerEntries === 'number' || typeof deletedGoals === 'number') {
        return `Deleted this facility / site and removed ${deletedLedgerEntries ?? 0} ledger entr${deletedLedgerEntries === 1 ? 'y' : 'ies'} plus ${deletedGoals ?? 0} goal${deletedGoals === 1 ? '' : 's'}.`;
      }
      return 'Deleted this facility / site.';
    }
    return `Deleted this ${getAuditEntityLabel(log.entityType).toLowerCase()}.`;
  }

  return `Recorded activity on this ${getAuditEntityLabel(log.entityType).toLowerCase()}.`;
}

export function getAuditTargetName(log: Pick<AuditLogEntry, 'entityType' | 'details' | 'entityId'>) {
  const details = parseAuditDetails(log.details);

  if (log.entityType === 'user') {
    return getStringDetail(details, 'email') || log.entityId;
  }

  if (log.entityType === 'report') {
    return (
      getStringDetail(details, 'title') ||
      getStringDetail(details, 'reportingPeriod') ||
      log.entityId
    );
  }

  if (log.entityType === 'goal' || log.entityType === 'sustainability_goal') {
    return getStringDetail(details, 'title') || log.entityId;
  }

  if (log.entityType === 'department') {
    const name = getStringDetail(details, 'name');
    const code = getStringDetail(details, 'code');
    return code ? `${name || 'Facility'} (${code})` : name || log.entityId;
  }

  if (log.entityType === 'ingest_job') {
    return getStringDetail(details, 'fileName') || log.entityId;
  }

  if (log.entityType === 'agent_task') {
    return getStringDetail(details, 'taskType')?.replace(/_/g, ' ') || log.entityId;
  }

  return log.entityId;
}

export function getAuditStatus(action: string): 'success' | 'pending' | 'warning' {
  if (action === 'delete' || action === 'import_failed') {
    return 'warning';
  }

  if (action === 'create' || action === 'update' || action === 'upload' || action === 'import') {
    return 'pending';
  }

  return 'success';
}

export function getAuditFeedMessage(log: Pick<AuditLogEntry, 'action' | 'entityType' | 'details' | 'user'>) {
  return `${getAuditActor(log)}: ${getAuditSummary(log)}`;
}

export function summarizeAuditFilters(filters: Pick<AuditCenterFilters, 'feature' | 'entityType' | 'entityId'>) {
  if (filters.entityType && filters.entityId) {
    return `${getAuditEntityLabel(filters.entityType)} ${filters.entityId}`;
  }

  if (filters.feature !== 'all') {
    return getAuditFeatureLabel(filters.feature);
  }

  return null;
}
