// Eco-Loom API Client

import type {
  Company,
  Department,
  CarbonLedgerEntry,
  SustainabilityGoal,
  Report,
  NotionConfig,
  DashboardMetrics,
  EmissionsByCategory,
  MonthlyEmissions,
  DepartmentEmissions,
  ActivityFeedItem,
  GapAnalysis,
  ProcessingQueueItem,
  CreateLedgerEntryInput,
  CreateGoalInput,
  UpdateGoalInput,
  ReportStatus,
  GenerateReportInput,
  GenerateReportResponse,
  PaginatedReportsResponse,
  NotionConfigInput,
  SyncFromNotionResponse,
  AgentTaskListResponse,
  AgentTaskActionResponse,
  AgentTaskHistoryResponse,
  AgentTaskRunSummary,
  LedgerFilters,
  PaginationParams,
  PaginatedLedgerEntriesResponse,
  PaginatedResponse,
} from './types';

// ============ API Base ============

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(error.message || 'API Error');
  }

  return response.json();
}

// ============ Companies ============

export async function getCompanies(): Promise<Company[]> {
  return fetchApi<Company[]>('/companies');
}

export async function getCompany(id: string): Promise<Company> {
  return fetchApi<Company>(`/companies/${id}`);
}

export async function updateCompanyReportDefaults(
  data: Pick<
    Company,
    | 'defaultReportMode'
    | 'defaultReportingStandard'
    | 'defaultGwpBasis'
    | 'defaultFactorSourcePolicy'
    | 'defaultOverridePolicy'
    | 'defaultReportOwnerName'
    | 'defaultReportOwnerEmail'
    | 'defaultReportReviewerIds'
    | 'defaultReportRecipients'
    | 'defaultApprovalWorkflow'
    | 'defaultOrganizationalBoundaryMethod'
    | 'defaultOrganizationalBoundaryNotes'
    | 'defaultBaseYear'
    | 'defaultBaseYearNotes'
    | 'defaultBaseYearRecalculationPolicy'
    | 'defaultScope2Method'
    | 'defaultScope2MarketBasedEmissions'
    | 'defaultScope2DisclosureNotes'
    | 'defaultScope2InstrumentNotes'
    | 'annualDisclosureNotes'
  >
): Promise<Company> {
  return fetchApi<Company>('/companies', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============ Departments ============

export async function getDepartments(companyId: string): Promise<Department[]> {
  return fetchApi<Department[]>(`/departments?companyId=${companyId}`);
}

// ============ Dashboard ============

export async function getDashboardMetrics(companyId: string): Promise<DashboardMetrics> {
  return fetchApi<DashboardMetrics>(`/dashboard/metrics?companyId=${companyId}`);
}

export async function getEmissionsByCategory(companyId: string): Promise<EmissionsByCategory> {
  return fetchApi<EmissionsByCategory>(`/dashboard/emissions-by-category?companyId=${companyId}`);
}

export async function getMonthlyEmissions(companyId: string, months: number = 12): Promise<MonthlyEmissions[]> {
  return fetchApi<MonthlyEmissions[]>(`/dashboard/monthly-emissions?companyId=${companyId}&months=${months}`);
}

export async function getDepartmentEmissions(companyId: string): Promise<DepartmentEmissions[]> {
  return fetchApi<DepartmentEmissions[]>(`/dashboard/department-emissions?companyId=${companyId}`);
}

export async function getActivityFeed(companyId: string, limit: number = 10): Promise<ActivityFeedItem[]> {
  return fetchApi<ActivityFeedItem[]>(`/dashboard/activity-feed?companyId=${companyId}&limit=${limit}`);
}

export async function getGapAnalysis(companyId: string): Promise<GapAnalysis> {
  return fetchApi<GapAnalysis>(`/dashboard/gap-analysis?companyId=${companyId}`);
}

// ============ Carbon Ledger ============

export async function getLedgerEntries(
  companyId: string,
  filters?: LedgerFilters,
  pagination?: PaginationParams
): Promise<PaginatedLedgerEntriesResponse> {
  const params = new URLSearchParams();
  params.set('companyId', companyId);
  
  if (filters) {
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.departmentId) params.set('departmentId', filters.departmentId);
    if (filters.sourceType) params.set('sourceType', filters.sourceType);
    if (filters.scope) params.set('scope', filters.scope);
    if (filters.search) params.set('search', filters.search);
  }
  
  if (pagination) {
    params.set('page', String(pagination.page));
    params.set('pageSize', String(pagination.pageSize));
    if (pagination.sortBy) params.set('sortBy', pagination.sortBy);
    if (pagination.sortOrder) params.set('sortOrder', pagination.sortOrder);
  }

  return fetchApi<PaginatedLedgerEntriesResponse>(`/ledger?${params.toString()}`);
}

export async function getLedgerEntry(id: string): Promise<CarbonLedgerEntry> {
  return fetchApi<CarbonLedgerEntry>(`/ledger/${id}`);
}

export async function createLedgerEntry(data: CreateLedgerEntryInput): Promise<CarbonLedgerEntry> {
  return fetchApi<CarbonLedgerEntry>('/ledger', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteLedgerEntry(id: string): Promise<void> {
  return fetchApi<void>(`/ledger/${id}`, { method: 'DELETE' });
}

export async function verifyLedgerEntry(id: string): Promise<CarbonLedgerEntry> {
  return fetchApi<CarbonLedgerEntry>(`/ledger/${id}/verify`, {
    method: 'POST',
  });
}

// ============ File Upload ============

export async function uploadFile(
  file: File,
  companyId: string,
  options?: {
    mode?: 'evidence_upload' | 'csv_import';
    departmentId?: string;
  }
): Promise<{ success: boolean; message?: string; job: ProcessingQueueItem }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('companyId', companyId);
  if (options?.mode) formData.append('mode', options.mode);
  if (options?.departmentId) formData.append('departmentId', options.departmentId);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

export async function getProcessingQueue(
  companyId: string,
  options?: { departmentId?: string; limit?: number }
): Promise<ProcessingQueueItem[]> {
  const params = new URLSearchParams({ companyId });
  if (options?.departmentId) params.set('departmentId', options.departmentId);
  if (typeof options?.limit === 'number') params.set('limit', String(options.limit));
  return fetchApi<ProcessingQueueItem[]>(`/upload?${params.toString()}`);
}

// ============ Sustainability Goals ============

export async function getGoals(companyId: string): Promise<SustainabilityGoal[]> {
  return fetchApi<SustainabilityGoal[]>(`/goals?companyId=${companyId}`);
}

export async function getGoal(id: string): Promise<SustainabilityGoal> {
  return fetchApi<SustainabilityGoal>(`/goals/${id}`);
}

export async function createGoal(data: CreateGoalInput & { companyId: string }): Promise<SustainabilityGoal> {
  return fetchApi<SustainabilityGoal>('/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGoal(id: string, data: UpdateGoalInput): Promise<SustainabilityGoal> {
  return fetchApi<SustainabilityGoal>(`/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteGoal(id: string): Promise<void> {
  return fetchApi<void>(`/goals/${id}`, { method: 'DELETE' });
}

// ============ Reports ============

export async function getReports(
  companyId: string,
  options?: {
    status?: ReportStatus | 'all';
    pagination?: PaginationParams;
  }
): Promise<PaginatedReportsResponse> {
  const params = new URLSearchParams();
  params.set('companyId', companyId);

  if (options?.status && options.status !== 'all') {
    params.set('status', options.status);
  }

  if (options?.pagination) {
    params.set('page', String(options.pagination.page));
    params.set('pageSize', String(options.pagination.pageSize));
    if (options.pagination.sortBy) params.set('sortBy', options.pagination.sortBy);
    if (options.pagination.sortOrder) params.set('sortOrder', options.pagination.sortOrder);
  }

  return fetchApi<PaginatedReportsResponse>(`/reports?${params.toString()}`);
}

export async function getReport(id: string): Promise<Report> {
  return fetchApi<Report>(`/reports/${id}`);
}

export async function generateReport(data: GenerateReportInput & { companyId: string }): Promise<GenerateReportResponse> {
  return fetchApi<GenerateReportResponse>('/reports/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function publishReport(id: string): Promise<Report> {
  return fetchApi<Report>(`/reports/${id}/publish`, { method: 'POST' });
}

// ============ Notion Integration ============

export async function getNotionConfig(): Promise<NotionConfig | null> {
  return fetchApi<NotionConfig | null>('/notion/config');
}

export async function updateNotionConfig(data: NotionConfigInput): Promise<NotionConfig> {
  return fetchApi<NotionConfig>('/notion/config', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function testNotionConnection(): Promise<{ success: boolean; message: string }> {
  return fetchApi<{ success: boolean; message: string }>('/notion/test', { method: 'POST' });
}

export async function syncToNotion(): Promise<{ success: boolean; syncedItems: number }> {
  return fetchApi<{ success: boolean; syncedItems: number }>('/notion/sync', { method: 'POST' });
}

export async function syncFromNotion(): Promise<SyncFromNotionResponse> {
  return fetchApi<SyncFromNotionResponse>('/notion/sync-from', { method: 'POST' });
}

// ============ Agent Tasks ============

export async function getAgentTasks(params?: {
  status?: string;
  taskType?: string;
  search?: string;
  limit?: number;
}): Promise<AgentTaskListResponse> {
  const query = new URLSearchParams();

  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.taskType && params.taskType !== 'all') query.set('taskType', params.taskType);
  if (params?.search) query.set('search', params.search);
  if (typeof params?.limit === 'number') query.set('limit', String(params.limit));

  return fetchApi<AgentTaskListResponse>(`/agent-tasks${query.toString() ? `?${query.toString()}` : ''}`);
}

export async function runAgentTasks(limit: number = 25): Promise<AgentTaskRunSummary & { success: boolean }> {
  return fetchApi<AgentTaskRunSummary & { success: boolean }>('/agent-tasks/run', {
    method: 'POST',
    body: JSON.stringify({ limit }),
  });
}

export async function retryAgentTask(id: string): Promise<AgentTaskActionResponse> {
  return fetchApi<AgentTaskActionResponse>(`/agent-tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'retry' }),
  });
}

export async function rescheduleAgentTask(id: string, scheduledAt: string): Promise<AgentTaskActionResponse> {
  return fetchApi<AgentTaskActionResponse>(`/agent-tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'reschedule', scheduledAt }),
  });
}

export async function getAgentTaskHistory(id: string): Promise<AgentTaskHistoryResponse> {
  return fetchApi<AgentTaskHistoryResponse>(`/agent-tasks/${id}`);
}
