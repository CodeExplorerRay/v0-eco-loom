// Constants for Eco-Loom application

export const API_BASE_URL = '/api';

// Emission scopes
export const EMISSION_SCOPES = ['Scope 1', 'Scope 2', 'Scope 3'] as const;

// Source types for emissions
export const SOURCE_TYPES = [
  'electricity',
  'travel',
  'shipping',
  'gas',
  'waste',
  'water',
  'other'
] as const;

// Goal types
export const GOAL_TYPES = [
  'emission_reduction',
  'renewable_energy',
  'waste_reduction',
  'water_conservation',
  'carbon_neutral',
  'other'
] as const;

// Report types
export const REPORT_TYPES = [
  'gap_analysis',
  'monthly_summary',
  'quarterly_review',
  'annual_report'
] as const;

// Status values
export const GOAL_STATUSES = ['on_track', 'at_risk', 'achieved', 'missed'] as const;
export const REPORT_STATUSES = ['draft', 'published', 'archived'] as const;
export const TASK_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
];

// Notion API
export const NOTION_API_VERSION = '2022-06-28';
export const NOTION_API_BASE_URL = 'https://api.notion.com/v1';

// Date formats
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';

// Sync settings
export const SYNC_BATCH_SIZE = 50;
export const SYNC_RETRY_MAX = 3;
export const SYNC_RETRY_DELAY = 1000; // milliseconds

// Cache expiration (in ms)
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
