// Eco-Loom TypeScript Types

// ============ Enums & Constants ============

export type SourceType = 
  | 'electricity'
  | 'travel'
  | 'shipping'
  | 'gas'
  | 'waste'
  | 'water'
  | 'other';

export type EmissionScope = 'Scope 1' | 'Scope 2' | 'Scope 3';

export type GoalStatus = 'on_track' | 'at_risk' | 'achieved' | 'missed';
export type GapSeverity = 'low' | 'medium' | 'high';

export type GoalType = 
  | 'emission_reduction'
  | 'renewable_energy'
  | 'waste_reduction'
  | 'water_conservation'
  | 'carbon_neutral'
  | 'other';

export type ReportStatus = 'draft' | 'published' | 'archived';
export type UserRole = 'admin' | 'standard';
export type AuditFeature =
  | 'ledger'
  | 'goals'
  | 'reports'
  | 'notion'
  | 'users'
  | 'ingest'
  | 'facilities'
  | 'automation'
  | 'system';

export type ReportType = 
  | 'gap_analysis'
  | 'monthly_summary'
  | 'quarterly_review'
  | 'annual_report';

export type ReportMode =
  | 'internal_management'
  | 'verifier_ready'
  | 'board_summary'
  | 'annual_disclosure';

export type OrganizationalBoundaryMethod =
  | 'operational_control'
  | 'financial_control'
  | 'equity_share';

export type Scope2Method = 'location_based' | 'market_based' | 'dual_reporting';
export type FacilityType =
  | 'production_campus'
  | 'hq_office'
  | 'logistics_hub'
  | 'retail_studio'
  | 'innovation_lab';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ProcessingStatus =
  | 'queued'
  | 'storing'
  | 'parsing'
  | 'importing'
  | 'completed'
  | 'failed';

// ============ Core Entities ============

export interface Company {
  id: string;
  name: string;
  industry?: string;
  headquarters?: string;
  employeeCount?: number;
  annualRevenue?: number;
  facilityCount?: number;
  defaultReportMode?: ReportMode;
  defaultReportingStandard?: string;
  defaultGwpBasis?: string;
  defaultFactorSourcePolicy?: string;
  defaultOverridePolicy?: string;
  defaultReportOwnerName?: string;
  defaultReportOwnerEmail?: string;
  defaultReportReviewerIds?: string;
  defaultReportRecipients?: string;
  defaultApprovalWorkflow?: string;
  defaultOrganizationalBoundaryMethod?: OrganizationalBoundaryMethod;
  defaultOrganizationalBoundaryNotes?: string;
  defaultBaseYear?: number;
  defaultBaseYearNotes?: string;
  defaultBaseYearRecalculationPolicy?: string;
  defaultScope2Method?: Scope2Method;
  defaultScope2MarketBasedEmissions?: number;
  defaultScope2DisclosureNotes?: string;
  defaultScope2InstrumentNotes?: string;
  annualDisclosureNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  budget?: number;
  locationDetail?: string;
  address?: string;
  country?: string;
  facilityType?: FacilityType;
  companyId: string;
  notionPageId?: string;
  notionSyncedAt?: string;
  notionLastEditedAt?: string;
  notionLastEditor?: string;
  notionSyncStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarbonLedgerEntry {
  id: string;
  sourceType: SourceType;
  sourceDocument?: string;
  documentUrl?: string;
  notes?: string;
  category: EmissionScope;
  subCategory?: string;
  activityValue: number;
  activityUnit: string;
  emissionFactor: number;
  emissionFactorUnit: string;
  emissionFactorId?: string | null;
  appliedEmissionFactor?: EmissionFactor | null;
  factorSource?: string | null;
  factorSourceFamily?: string | null;
  factorYear?: number | null;
  factorRegion?: string | null;
  factorMethodology?: string | null;
  factorGwpBasis?: string | null;
  factorDescription?: string | null;
  factorOverridden?: boolean;
  factorOverrideReason?: string | null;
  factorOverrideAt?: string | null;
  factorOverrideByUserId?: string | null;
  factorOverrideByName?: string | null;
  co2Equivalent: number;
  co2Unit: string;
  transactionDate: string;
  reportingPeriod: string;
  departmentId: string;
  department?: Department;
  companyId: string;
  notionPageId?: string;
  notionSyncedAt?: string;
  notionLastEditedAt?: string;
  notionLastEditor?: string;
  notionSyncStatus?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedByUserId?: string;
  verifiedAt?: string;
  createdByUserId?: string;
  createdByName?: string;
  updatedByUserId?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
  rawExtractedText?: string;
  aiClassification?: string;
}

export interface LedgerFactorOverrideInput {
  emissionFactor: number;
  reason: string;
  source?: string;
  year?: number;
  methodology?: string;
  description?: string;
  gwpBasis?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: string;
  companyId: string;
  demoProtected?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionInfo {
  authenticated: boolean;
  companyId?: string;
  role?: UserRole;
  user?: SessionUser;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string | null;
  user?: SessionUser | null;
  details?: string | null;
  createdAt: string;
}

export interface AuditCenterFilters {
  search: string;
  feature: 'all' | AuditFeature;
  action: string;
  actor: string;
  dateFrom: string;
  dateTo: string;
  entityType: string;
  entityId: string;
}

export interface AuditCenterRequest {
  key: number;
  filters: Partial<AuditCenterFilters>;
  title?: string;
}

export interface SustainabilityGoal {
  id: string;
  title: string;
  description?: string;
  goalType: GoalType;
  targetValue: number;
  targetUnit: string;
  baselineValue?: number;
  baselineYear?: number;
  targetYear: number;
  currentValue: number;
  progressPercent: number;
  status: GoalStatus;
  departmentId?: string;
  department?: Department;
  companyId: string;
  notionPageId?: string;
  notionSyncedAt?: string;
  notionLastEditedAt?: string;
  notionLastEditor?: string;
  notionSyncStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  title: string;
  reportType: ReportType;
  reportMode?: ReportMode;
  reportingPeriod: string;
  summary: string;
  totalEmissions: number;
  previousPeriodEmissions?: number;
  gapsIdentified?: string;
  recommendations?: string;
  status: ReportStatus;
  companyId: string;
  notionPageId?: string;
  notionSyncedAt?: string;
  notionLastEditedAt?: string;
  notionLastEditor?: string;
  notionSyncStatus?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  reportRecipients?: string;
  reportReviewerIds?: string;
  approvalWorkflow?: string;
  approvalStatus?: string;
  approvedByName?: string;
  approvedByEmail?: string;
  approvedAt?: string;
  organizationalBoundaryMethod?: OrganizationalBoundaryMethod;
  organizationalBoundaryNotes?: string;
  baseYear?: number;
  baseYearNotes?: string;
  baseYearRecalculationPolicy?: string;
  scope2Method?: Scope2Method;
  scope2LocationBasedEmissions?: number;
  scope2MarketBasedEmissions?: number;
  scope2DisclosureNotes?: string;
  scope2InstrumentNotes?: string;
  methodologyMetadata?: ReportMethodologyMetadata;
  boundaryMetadata?: ReportBoundaryMetadata;
  factorProvenance?: ReportFactorProvenanceSummary;
  reportAnalytics?: ReportAnalyticsSummary;
  appendices?: ReportAppendixPackage;
  verifierManifest?: ReportVerifierManifest;
}

export interface ReportMethodologyMetadata {
  reportingStandard: string;
  gwpBasis: string;
  factorSourcePolicy: string;
  overridePolicy: string;
  methodologyNotes: string;
  reportOwnerName?: string;
  reportOwnerEmail?: string;
  reportRecipients?: string[];
  reviewerNames?: string[];
  approvalWorkflow?: string;
  approvalStatus?: string;
  approvedByName?: string;
  approvedByEmail?: string;
  approvedAt?: string;
  baseYear?: number;
  baseYearNotes?: string;
  baseYearRecalculationPolicy?: string;
  scope2Method?: Scope2Method;
  scope2LocationBasedEmissions?: number;
  scope2MarketBasedEmissions?: number;
  scope2DisclosureNotes?: string;
  scope2InstrumentNotes?: string;
}

export interface ReportBoundaryDepartment {
  name: string;
  code?: string | null;
  address?: string | null;
  country?: string | null;
}

export interface ReportBoundaryMetadata {
  boundarySummary: string;
  includedDepartments: ReportBoundaryDepartment[];
  exclusions: string;
  organizationalBoundaryMethod?: OrganizationalBoundaryMethod;
  organizationalBoundaryNotes?: string;
}

export interface ReportFactorSourceBreakdown {
  label: string;
  entries: number;
  emissions: number;
}

export interface ReportFactorProvenanceSummary {
  totalEntries: number;
  overriddenEntries: number;
  officialEntries: number;
  supplementalEntries: number;
  approvedEntries: number;
  unknownEntries: number;
  overriddenEmissions: number;
  sourceBreakdown: ReportFactorSourceBreakdown[];
  methodologyList: string[];
  summaryText: string;
}

export interface ReportVerifierManifest {
  exportedAt: string;
  reportId: string;
  reportTitle: string;
  reportMode: ReportMode;
  reportingPeriod: string;
  evidenceRowCount: number;
  factorRegisterCount: number;
  overrideCount: number;
  unresolvedIssueCount: number;
  checksum: string;
}

export interface ReportEvidenceRegisterItem {
  entryId: string;
  transactionDate: string;
  sourceType: SourceType;
  category: EmissionScope;
  departmentName?: string | null;
  sourceDocument?: string | null;
  verified: boolean;
  verifiedAt?: string | null;
}

export interface ReportFactorRegisterItem {
  key: string;
  sourceLabel: string;
  sourceFamily?: string | null;
  year?: number | null;
  region?: string | null;
  methodology?: string | null;
  gwpBasis?: string | null;
  factorUnit: string;
  entries: number;
  emissions: number;
}

export interface ReportOverrideRegisterItem {
  entryId: string;
  transactionDate: string;
  departmentName?: string | null;
  factorValue: number;
  factorUnit: string;
  overrideReason: string;
  overrideBy?: string | null;
  overrideAt?: string | null;
}

export interface ReportQualityIssue {
  id: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  count: number;
}

export interface ReportAppendixPackage {
  evidenceRegister: ReportEvidenceRegisterItem[];
  factorRegister: ReportFactorRegisterItem[];
  overrideRegister: ReportOverrideRegisterItem[];
  unresolvedQualityIssues: ReportQualityIssue[];
}

export interface ReportAnalyticsBreakdownItem {
  label: string;
  entries: number;
  emissions: number;
  percent: number;
}

export interface ReportDepartmentAnalytics {
  departmentName: string;
  departmentCode?: string | null;
  entries: number;
  emissions: number;
  percent: number;
  verifiedEntries: number;
  overriddenEntries: number;
}

export interface ReportQualitySummary {
  totalEntries: number;
  verifiedEntries: number;
  unverifiedEntries: number;
  overriddenEntries: number;
  officialEntries: number;
  supplementalEntries: number;
  unknownProvenanceEntries: number;
  entriesWithSourceDocument: number;
  verificationRate: number;
  evidenceCoverageRate: number;
}

export interface ReportTrendPoint {
  label: string;
  period: string;
  emissions: number;
  entryCount: number;
}

export interface ReportIntensityMetric {
  label: string;
  value: number;
  unit: string;
  denominator: number;
  denominatorLabel: string;
  basis: string;
}

export interface ReportAnalyticsSummary {
  totalEntries: number;
  totalEmissions: number;
  breakdownByScope: ReportAnalyticsBreakdownItem[];
  breakdownBySourceType: ReportAnalyticsBreakdownItem[];
  breakdownByDepartment: ReportDepartmentAnalytics[];
  topEmissionSources: ReportAnalyticsBreakdownItem[];
  topDepartments: ReportDepartmentAnalytics[];
  monthlyTrend: ReportTrendPoint[];
  intensityMetrics: ReportIntensityMetric[];
  quality: ReportQualitySummary;
}

export interface NotionConfig {
  id: string;
  companyId?: string | null;
  apiKey?: string;
  databaseIdLedger?: string;
  databaseIdGoals?: string;
  databaseIdReports?: string;
  databaseIdDepts?: string;
  databaseIdKnowledgeBase?: string;
  workspaceName?: string;
  lastSyncAt?: string;
  syncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotionStatus {
  configured: boolean;
  syncEnabled: boolean;
  ledgerConfigured: boolean;
  goalsConfigured?: boolean;
  reportsConfigured?: boolean;
  facilitiesConfigured?: boolean;
  knowledgeBaseConfigured?: boolean;
  knowledgeBaseHealth?: 'not_mapped' | 'needs_first_sync' | 'update_available' | 'current' | 'failed';
  knowledgeBaseHealthMessage?: string;
  knowledgeBaseLastSyncedAt?: string | null;
  knowledgeBaseLastTrigger?: string | null;
  knowledgeBaseLastDeploymentId?: string | null;
  knowledgeBaseArticleCount?: number;
  knowledgeBaseVersion?: string;
  coreMappedDatabaseCount?: number;
  mappedDatabaseCount?: number;
  workspaceName?: string | null;
  lastSyncAt?: string | null;
}

export interface AgentTaskRunResult {
  id: string;
  taskType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

export interface AgentTaskRunSummary {
  total: number;
  completed: number;
  failed: number;
  results: AgentTaskRunResult[];
}

export interface AgentTaskRecord {
  id: string;
  taskType: string;
  status: TaskStatus;
  payload?: string | null;
  result?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  maxRetries: number;
  scheduledAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTaskStatusCounts {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  retried: number;
}

export interface AgentTaskListResponse {
  tasks: AgentTaskRecord[];
  counts: AgentTaskStatusCounts;
}

export interface AgentTaskActionResponse {
  success: boolean;
  task: AgentTaskRecord;
}

export interface AgentTaskAttemptRecord {
  id: string;
  taskId: string;
  attemptNumber: number;
  status: TaskStatus;
  triggerSource?: string | null;
  startedAt: string;
  completedAt?: string | null;
  result?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTaskTimelineItem {
  id: string;
  type: 'attempt' | 'event';
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'info';
  occurredAt: string;
}

export interface AgentTaskHistoryResponse {
  task: AgentTaskRecord;
  attempts: AgentTaskAttemptRecord[];
  timeline: AgentTaskTimelineItem[];
}

export interface SyncFromNotionResponse {
  success: boolean;
  syncedItems: number;
  skippedItems?: number;
  queuedTasks?: number;
  agentRun?: AgentTaskRunSummary;
  duration?: number;
  message?: string;
  errors?: Array<{ entity: string; error: string }>;
}

export interface EmissionFactor {
  id: string;
  sourceType: SourceType;
  activityUnit: string;
  factor: number;
  factorUnit: string;
  scope?: EmissionScope;
  region?: string;
  year: number;
  source?: string;
  sourceFamily?: string;
  methodology?: string;
  gwpBasis?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ API Response Types ============

export interface DashboardMetrics {
  totalCo2eThisMonth: number;
  emissionsVsTarget: number;
  activeDepartments: number;
  complianceScore: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export type DashboardSystemStatusTone = 'healthy' | 'attention' | 'disabled' | 'info';

export type DashboardSystemStatusKey =
  | 'document_intake'
  | 'calculation_library'
  | 'notion_workspace'
  | 'automation_queue';

export interface DashboardSystemStatusItem {
  key: DashboardSystemStatusKey;
  label: string;
  statusLabel: string;
  tone: DashboardSystemStatusTone;
  description: string;
  meta?: string;
  updatedAt?: string | null;
}

export interface DashboardSystemStatus {
  checkedAt: string;
  summary: string;
  items: DashboardSystemStatusItem[];
}

export interface EmissionsByCategory {
  scope1: number;
  scope2: number;
  scope3: number;
  total?: number;
  verifiedTotal?: number;
  unverifiedTotal?: number;
  verificationRate?: number;
  period?: string;
  periodLabel?: string;
  entryCount?: number;
  breakdown?: EmissionsByCategoryBreakdownItem[];
}

export interface EmissionsByCategoryBreakdownItem {
  key: 'scope1' | 'scope2' | 'scope3';
  name: string;
  value: number;
  share: number;
  verifiedValue: number;
  unverifiedValue: number;
  entryCount: number;
  color: string;
  description: string;
}

export interface MonthlyEmissions {
  month: string;
  emissions: number;
  target?: number;
  label?: string;
  entryCount?: number;
  verifiedEmissions?: number;
  verificationRate?: number;
}

export interface DepartmentEmissions {
  id: string;
  name: string;
  code: string;
  country?: string | null;
  emissions: number;
  percent: number;
  entryCount: number;
  verifiedEntries: number;
  verifiedEmissions: number;
  unverifiedEmissions: number;
  verificationRate: number;
  period?: string;
  periodLabel?: string;
  isSelected?: boolean;
}

export interface ActivityFeedItem {
  id: string;
  feature: AuditFeature;
  action: string;
  message: string;
  timestamp: string;
  status: 'success' | 'pending' | 'warning';
  entityType?: string;
  entityId?: string;
}

export interface GapAnalysis {
  goalsAtRisk: number;
  goalsOnTrack: number;
  goalsAchieved: number;
  totalGap: number;
  totalGoals?: number;
  totalEmissions?: number;
  verifiedEmissions?: number;
  verificationRate?: number;
  activeGapCount?: number;
  gapTotalsByUnit?: GapAnalysisUnitTotal[];
  topGaps?: StoredGapItem[];
  largestGap?: StoredGapItem | null;
}

export interface GapAnalysisUnitTotal {
  unit: string;
  total: number;
  itemCount: number;
  label: string;
}

export interface GapAnalysisGoalItem {
  kind: 'goal';
  goal: string;
  goalType: GoalType;
  department: string;
  departmentId?: string | null;
  status: GoalStatus;
  progress: number;
  currentValue: number;
  currentUnit: string;
  targetValue: number;
  targetUnit: string;
  baselineValue?: number | null;
  gapValue: number;
  gapUnit: string;
  direction: 'increase' | 'decrease';
  relation: 'above_target' | 'below_target' | 'on_target';
  severity: GapSeverity;
  summary: string;
}

export interface GapAnalysisIssueItem {
  kind: 'issue';
  facility: string;
  issue: string;
  severity: GapSeverity;
  summary: string;
}

export interface GapAnalysisAreaItem {
  kind: 'area';
  area: string;
  gapValue?: number;
  gapUnit?: string;
  severity: GapSeverity;
  summary: string;
}

export type StoredGapItem =
  | GapAnalysisGoalItem
  | GapAnalysisIssueItem
  | GapAnalysisAreaItem;

export interface ProcessingQueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  ingestType?: 'evidence_upload' | 'csv_import';
  status: ProcessingStatus;
  progress: number;
  uploadedAt: string;
  departmentId?: string | null;
  departmentName?: string | null;
  mimeType?: string;
  message?: string | null;
  rowCount?: number | null;
  createdEntries?: number | null;
  failedRows?: number | null;
  documentUrl?: string | null;
  error?: string;
}

// ============ API Input Types ============

export interface CreateLedgerEntryInput {
  sourceType: SourceType;
  sourceDocument?: string;
  notes?: string;
  category: EmissionScope;
  activityValue: number;
  activityUnit: string;
  factorRegion?: string;
  factorYear?: number;
  transactionDate: string;
  departmentId: string;
  description?: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  goalType: GoalType;
  targetValue: number;
  targetUnit: string;
  baselineValue?: number;
  baselineYear?: number;
  targetYear: number;
  departmentId?: string;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  currentValue?: number;
  status?: GoalStatus;
}

export interface GenerateReportInput {
  reportType: ReportType;
  reportMode?: ReportMode;
  reportingPeriod: string;
  departmentId?: string;
}

export interface GenerateReportResponse {
  report: Report;
  reused: boolean;
}

export interface ReportSummaryCounts {
  total: number;
  published: number;
  draft: number;
  archived: number;
  thisMonth: number;
}

export interface PaginatedReportsResponse extends PaginatedResponse<Report> {
  counts: ReportSummaryCounts;
}

export interface NotionConfigInput {
  apiKey: string;
  databaseIdLedger?: string;
  databaseIdGoals?: string;
  databaseIdReports?: string;
  databaseIdDepts?: string;
  databaseIdKnowledgeBase?: string;
}

// ============ Filter Types ============

export interface LedgerFilters {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  sourceType?: SourceType;
  scope?: EmissionScope;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LedgerEntriesSummary {
  entryCount: number;
  totalCo2e: number;
  verifiedCount: number;
  verifiedCo2e: number;
  pendingCount: number;
  pendingCo2e: number;
  notionSyncedCount: number;
  notionLinkedCount?: number;
  notionLinkReviewCount?: number;
  notionPendingCount?: number;
}

export interface PaginatedLedgerEntriesResponse extends PaginatedResponse<CarbonLedgerEntry> {
  summary: LedgerEntriesSummary;
}
