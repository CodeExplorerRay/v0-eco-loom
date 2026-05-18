import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import {
  buildEmissionFactorRecordKey,
  buildEmissionFactorSeedData,
  buildLedgerFactorProvenance,
  getRequiredEmissionFactor,
} from '@/lib/emissions/factor-service';
import type { FacilityType, GoalType, ReportMode, ReportType, SourceType } from '@/lib/types';

export const DEMO_COMPANY_ID = 'demo-company-1';

export const DEMO_COMPANY = {
  name: 'Verdant Loop Systems',
  industry: 'Circular Manufacturing & Commerce',
  headquarters: 'Amsterdam, Netherlands',
  employeeCount: 680,
  annualRevenue: 214000000,
  facilityCount: 6,
  defaultReportMode: 'internal_management',
  defaultReportingStandard: 'GHG Protocol Corporate Standard',
  defaultGwpBasis:
    'Operational carbon accounting is calculated from the approved factor library with entry-level provenance preserved across the ledger and reports.',
  defaultFactorSourcePolicy:
    'Use the Eco-Loom approved factor library first, preserve factor provenance per entry, and disclose any overrides in reporting outputs.',
  defaultOverridePolicy:
    'Only admins can override factors, and every override must include a reason, actor, and timestamp.',
  defaultReportOwnerName: 'Verdant Loop Sustainability Office',
  defaultReportOwnerEmail: 'sustainability@verdantloop.example',
  defaultReportRecipients: 'ops@verdantloop.example, finance@verdantloop.example',
  defaultApprovalWorkflow:
    'Facility review followed by sustainability lead approval before publication.',
  defaultOrganizationalBoundaryMethod: 'operational_control',
  defaultOrganizationalBoundaryNotes:
    'The workspace reports sites under operational control and documents any material exclusions in report metadata.',
  defaultBaseYear: 2024,
  defaultBaseYearNotes:
    'Base year performance is reset only when structural or methodological changes materially affect comparability.',
  defaultBaseYearRecalculationPolicy:
    'Recalculate the base year for acquisitions, divestitures, insourcing, outsourcing, or material factor methodology changes.',
  defaultScope2Method: 'location_based',
  annualDisclosureNotes:
    'External disclosure outputs should call out site coverage, factor provenance, and any remaining estimation assumptions.',
} as const;

export type DemoFacilitySeed = {
  id: string;
  name: string;
  code: string;
  budget: number;
  locationDetail: string;
  address: string;
  country: string;
  facilityType: FacilityType;
};

export const DEMO_FACILITIES: DemoFacilitySeed[] = [
  {
    id: 'facility-cascadia',
    name: 'Cascadia Manufacturing Campus',
    code: 'US-CMC',
    budget: 6200000,
    locationDetail: 'Building A, Assembly Spine',
    address: '4100 Harbor Green Way, Seattle, WA 98134',
    country: 'United States',
    facilityType: 'production_campus',
  },
  {
    id: 'facility-rotterdam',
    name: 'Rotterdam Flow Hub',
    code: 'NL-RFH',
    budget: 3400000,
    locationDetail: 'Dock 3, Cold Chain Wing',
    address: '18 Maas Logistics Park, Rotterdam 3089, Netherlands',
    country: 'Netherlands',
    facilityType: 'logistics_hub',
  },
  {
    id: 'facility-berlin',
    name: 'Berlin Coordination Office',
    code: 'DE-BCO',
    budget: 1900000,
    locationDetail: 'Floor 6, Operations Studio',
    address: '72 Friedrichstrasse, Berlin 10117, Germany',
    country: 'Germany',
    facilityType: 'hq_office',
  },
  {
    id: 'facility-singapore',
    name: 'Singapore Experience Studio',
    code: 'SG-SES',
    budget: 1600000,
    locationDetail: 'Level 2, Customer Lab',
    address: '9 Marina View, Singapore 018937',
    country: 'Singapore',
    facilityType: 'retail_studio',
  },
  {
    id: 'facility-seoul',
    name: 'Seoul Materials Lab',
    code: 'KR-SML',
    budget: 2400000,
    locationDetail: 'Prototype Hall, Bay 4',
    address: '121 Teheran-ro, Seoul 06133, South Korea',
    country: 'South Korea',
    facilityType: 'innovation_lab',
  },
  {
    id: 'facility-monterrey',
    name: 'Monterrey Circular Works',
    code: 'MX-MCW',
    budget: 4700000,
    locationDetail: 'Block C, Recovery Line',
    address: '255 Parque Industrial Norte, Monterrey 66600, Mexico',
    country: 'Mexico',
    facilityType: 'production_campus',
  },
];

type DemoGoalSeed = {
  id: string;
  title: string;
  description: string;
  goalType: GoalType;
  targetValue: number;
  targetUnit: string;
  baselineValue: number;
  baselineYear: number;
  targetYear: number;
  currentValue: number;
  progressPercent: number;
  status: 'on_track' | 'at_risk' | 'achieved' | 'missed';
  departmentId?: string;
};

const DEMO_GOALS: DemoGoalSeed[] = [
  {
    id: 'goal-portfolio-intensity',
    title: 'Keep 2026 portfolio emissions below 720,000 kg CO2e',
    description:
      'Hold the six-site portfolio inside the approved annual carbon budget while efficiency work continues across production, logistics, office, retail, and lab operations.',
    goalType: 'other',
    targetValue: 720000,
    targetUnit: 'kg CO2e annual cap',
    baselineValue: 845000,
    baselineYear: 2025,
    targetYear: 2026,
    currentValue: 688000,
    progressPercent: 82.4,
    status: 'on_track',
  },
  {
    id: 'goal-cascadia-water',
    title: 'Raise water recirculation at Cascadia to 70%',
    description:
      'Expand closed-loop wash and cooling systems to reduce freshwater demand on the primary manufacturing campus.',
    goalType: 'water_conservation',
    targetValue: 70,
    targetUnit: '% recirculated',
    baselineValue: 28,
    baselineYear: 2024,
    targetYear: 2027,
    currentValue: 44,
    progressPercent: 38.1,
    status: 'at_risk',
    departmentId: 'facility-cascadia',
  },
  {
    id: 'goal-rotterdam-waste',
    title: 'Keep Rotterdam landfill waste below 3%',
    description:
      'Push the hub toward near-zero landfill by improving pallet recovery, stretch wrap collection, and packaging segregation.',
    goalType: 'waste_reduction',
    targetValue: 3,
    targetUnit: '% landfill share',
    baselineValue: 12,
    baselineYear: 2024,
    targetYear: 2026,
    currentValue: 5.1,
    progressPercent: 76.7,
    status: 'on_track',
    departmentId: 'facility-rotterdam',
  },
  {
    id: 'goal-berlin-renewables',
    title: 'Source 100% renewable power for Berlin office',
    description:
      'Move the coordination office to a fully renewable electricity contract and tighten HVAC scheduling.',
    goalType: 'renewable_energy',
    targetValue: 100,
    targetUnit: '% renewable electricity',
    baselineValue: 46,
    baselineYear: 2024,
    targetYear: 2026,
    currentValue: 88,
    progressPercent: 77.8,
    status: 'on_track',
    departmentId: 'facility-berlin',
  },
  {
    id: 'goal-singapore-travel',
    title: 'Reduce experience-studio travel emissions 30%',
    description:
      'Shift more customer workshops to hybrid delivery and cluster regional visits into lower-emission travel schedules.',
    goalType: 'emission_reduction',
    targetValue: 70,
    targetUnit: '% of baseline',
    baselineValue: 100,
    baselineYear: 2024,
    targetYear: 2027,
    currentValue: 86,
    progressPercent: 46.7,
    status: 'at_risk',
    departmentId: 'facility-singapore',
  },
  {
    id: 'goal-seoul-energy',
    title: 'Improve lab equipment energy intensity 18%',
    description:
      'Tune environmental chambers and bench instrumentation to lower per-test energy use at the innovation lab.',
    goalType: 'emission_reduction',
    targetValue: 82,
    targetUnit: '% of baseline',
    baselineValue: 100,
    baselineYear: 2024,
    targetYear: 2027,
    currentValue: 89,
    progressPercent: 61.1,
    status: 'on_track',
    departmentId: 'facility-seoul',
  },
  {
    id: 'goal-monterrey-materials',
    title: 'Reach 85% circular input content at Monterrey',
    description:
      'Increase recovered feedstock use and reduce virgin material demand across the recovery line.',
    goalType: 'other',
    targetValue: 85,
    targetUnit: '% circular input',
    baselineValue: 48,
    baselineYear: 2024,
    targetYear: 2028,
    currentValue: 63,
    progressPercent: 40.5,
    status: 'on_track',
    departmentId: 'facility-monterrey',
  },
];

type DemoReportSeed = {
  id: string;
  title: string;
  reportType: ReportType;
  reportMode: ReportMode;
  reportingPeriod: string;
  summary: string;
  totalEmissions: number;
  previousPeriodEmissions?: number;
  gapsIdentified?: string;
  recommendations?: string;
  status: 'draft' | 'published' | 'archived';
  approvalStatus?: 'pending_review' | 'approved';
  approvedByName?: string;
  approvedByEmail?: string;
  approvedAt?: Date;
  publishedAt?: Date;
};

const DEMO_REPORTS: DemoReportSeed[] = [
  {
    id: 'report-2026-03-gap',
    title: 'March 2026 Facility Gap Analysis',
    reportType: 'gap_analysis',
    reportMode: 'verifier_ready',
    reportingPeriod: '2026-03',
    summary:
      'March 2026 stayed within the monthly carbon plan overall, with Berlin and Rotterdam performing strongest while Cascadia and Singapore still need focused efficiency work.',
    totalEmissions: 48510,
    previousPeriodEmissions: 46730,
    gapsIdentified: JSON.stringify([
      { facility: 'Cascadia Manufacturing Campus', issue: 'Water recirculation behind target', severity: 'high' },
      { facility: 'Singapore Experience Studio', issue: 'Travel emissions remained above plan', severity: 'medium' },
    ]),
    recommendations:
      'Prioritize water-loop commissioning at Cascadia, shift Singapore customer sessions to hybrid delivery, and keep Rotterdam packaging controls in the current operating rhythm.',
    status: 'draft',
    approvalStatus: 'pending_review',
  },
  {
    id: 'report-2026-q1-review',
    title: 'Q1 2026 Portfolio Review',
    reportType: 'quarterly_review',
    reportMode: 'board_summary',
    reportingPeriod: '2026-Q1',
    summary:
      'Q1 2026 stayed inside the current annual carbon plan, with emissions concentrated in the two production campuses and measurable waste improvements at Rotterdam.',
    totalEmissions: 140190,
    previousPeriodEmissions: 146800,
    gapsIdentified: JSON.stringify([
      { facility: 'Monterrey Circular Works', issue: 'Natural gas use exceeded expected seasonal range', severity: 'medium' },
      { facility: 'Seoul Materials Lab', issue: 'Pilot equipment load remains uneven across test cycles', severity: 'low' },
    ]),
    recommendations:
      'Run a combustion tune-up at Monterrey, shift selected Seoul test benches to off-peak operation, and extend packaging recovery controls from Rotterdam to Singapore.',
    status: 'published',
    approvalStatus: 'approved',
    approvedByName: 'Eco-Loom Admin',
    approvedByEmail: 'admin@eco-loom.local',
    approvedAt: new Date('2026-04-02T09:15:00.000Z'),
    publishedAt: new Date('2026-04-02T09:30:00.000Z'),
  },
  {
    id: 'report-2026-02-summary',
    title: 'February 2026 Facility Summary',
    reportType: 'monthly_summary',
    reportMode: 'internal_management',
    reportingPeriod: '2026-02',
    summary:
      'February stayed close to plan overall, with office and retail sites trending down while production and logistics volumes rose slightly.',
    totalEmissions: 46730,
    previousPeriodEmissions: 45210,
    status: 'archived',
    approvalStatus: 'approved',
  },
  {
    id: 'report-2025-annual-disclosure',
    title: '2025 Annual Disclosure Draft',
    reportType: 'annual_report',
    reportMode: 'annual_disclosure',
    reportingPeriod: '2025',
    summary:
      'Draft annual disclosure pack covering the six-site portfolio, boundary assumptions, factor provenance, and facility-level performance themes.',
    totalEmissions: 704800,
    previousPeriodEmissions: 751200,
    recommendations:
      'Strengthen the annual narrative around manufacturing water recirculation, logistics waste avoidance, and renewable electricity procurement before final publication.',
    status: 'draft',
  },
];

export const DEMO_NOTION_CONFIG = {
  id: 'notion-config-demo',
  companyId: DEMO_COMPANY_ID,
  workspaceName: 'Verdant Loop Workspace',
  syncEnabled: true,
  lastSyncAt: new Date('2026-03-25T08:30:00.000Z'),
};

type DemoAutomationHistoryContext = {
  companyId: string;
  sampleEntryId?: string | null;
};

function buildDemoAutomationHistory(input: DemoAutomationHistoryContext) {
  const sampleEntryId = input.sampleEntryId || 'demo-ledger-entry';

  const tasks = [
    {
      id: 'agent-task-demo-monthly-report',
      taskType: 'draft_monthly_report',
      status: 'completed',
      scheduledAt: new Date('2026-03-25T08:30:00.000Z'),
      startedAt: new Date('2026-03-25T08:30:00.000Z'),
      completedAt: new Date('2026-03-25T08:31:10.000Z'),
      payload: JSON.stringify({
        companyId: input.companyId,
        reportingPeriod: '2026-03',
      }),
      result: JSON.stringify({
        taskId: 'agent-task-demo-monthly-report',
        summary: 'Monthly report already exists for this period.',
        reportId: 'report-2026-03-gap',
        reused: true,
      }),
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date('2026-03-25T08:22:00.000Z'),
      updatedAt: new Date('2026-03-25T08:31:10.000Z'),
    },
    {
      id: 'agent-task-demo-goal-recalc',
      taskType: 'recalculate_goal_progress',
      status: 'completed',
      scheduledAt: new Date('2026-03-29T09:14:00.000Z'),
      startedAt: new Date('2026-03-29T09:14:00.000Z'),
      completedAt: new Date('2026-03-29T09:14:38.000Z'),
      payload: JSON.stringify({
        companyId: input.companyId,
        trigger: 'notion_import',
      }),
      result: JSON.stringify({
        taskId: 'agent-task-demo-goal-recalc',
        summary: 'Recalculated 7 goals.',
        updatedGoals: 7,
      }),
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date('2026-03-29T09:12:00.000Z'),
      updatedAt: new Date('2026-03-29T09:14:38.000Z'),
    },
    {
      id: 'agent-task-demo-classify-failed',
      taskType: 'classify_ledger_entry',
      status: 'failed',
      scheduledAt: new Date('2026-03-29T10:35:00.000Z'),
      startedAt: new Date('2026-03-29T10:35:00.000Z'),
      completedAt: new Date('2026-03-29T10:36:15.000Z'),
      payload: JSON.stringify({
        companyId: input.companyId,
        entryId: sampleEntryId,
      }),
      result: null,
      errorMessage:
        'Classification service timed out while updating the ledger entry. Retry the task after the queue clears.',
      retryCount: 2,
      maxRetries: 2,
      createdAt: new Date('2026-03-29T10:25:00.000Z'),
      updatedAt: new Date('2026-03-29T10:36:15.000Z'),
    },
    {
      id: 'agent-task-demo-report-pending',
      taskType: 'draft_monthly_report',
      status: 'pending',
      scheduledAt: new Date('2026-03-30T08:30:00.000Z'),
      startedAt: null,
      completedAt: null,
      payload: JSON.stringify({
        companyId: input.companyId,
        reportingPeriod: '2026-03',
      }),
      result: null,
      errorMessage:
        'Report draft was deferred after a transient sync dependency warning. The queue will retry it in the next window.',
      retryCount: 1,
      maxRetries: 3,
      createdAt: new Date('2026-03-30T06:42:00.000Z'),
      updatedAt: new Date('2026-03-30T06:50:00.000Z'),
    },
  ];

  const attempts = [
    {
      id: 'agent-task-attempt-demo-monthly-report-1',
      taskId: 'agent-task-demo-monthly-report',
      attemptNumber: 1,
      status: 'completed',
      triggerSource: 'cron',
      startedAt: new Date('2026-03-25T08:30:00.000Z'),
      completedAt: new Date('2026-03-25T08:31:10.000Z'),
      result: JSON.stringify({
        summary: 'Monthly report already exists for this period.',
      }),
      errorMessage: null,
      createdAt: new Date('2026-03-25T08:30:00.000Z'),
      updatedAt: new Date('2026-03-25T08:31:10.000Z'),
    },
    {
      id: 'agent-task-attempt-demo-goal-recalc-1',
      taskId: 'agent-task-demo-goal-recalc',
      attemptNumber: 1,
      status: 'completed',
      triggerSource: 'notion_import',
      startedAt: new Date('2026-03-29T09:14:00.000Z'),
      completedAt: new Date('2026-03-29T09:14:38.000Z'),
      result: JSON.stringify({
        summary: 'Recalculated 7 goals.',
      }),
      errorMessage: null,
      createdAt: new Date('2026-03-29T09:14:00.000Z'),
      updatedAt: new Date('2026-03-29T09:14:38.000Z'),
    },
    {
      id: 'agent-task-attempt-demo-classify-failed-1',
      taskId: 'agent-task-demo-classify-failed',
      attemptNumber: 1,
      status: 'failed',
      triggerSource: 'manual',
      startedAt: new Date('2026-03-29T10:28:00.000Z'),
      completedAt: new Date('2026-03-29T10:28:42.000Z'),
      result: null,
      errorMessage: 'Classification service timed out while loading the evidence metadata.',
      createdAt: new Date('2026-03-29T10:28:00.000Z'),
      updatedAt: new Date('2026-03-29T10:28:42.000Z'),
    },
    {
      id: 'agent-task-attempt-demo-classify-failed-2',
      taskId: 'agent-task-demo-classify-failed',
      attemptNumber: 2,
      status: 'failed',
      triggerSource: 'cron',
      startedAt: new Date('2026-03-29T10:35:00.000Z'),
      completedAt: new Date('2026-03-29T10:36:15.000Z'),
      result: null,
      errorMessage:
        'Classification service timed out while updating the ledger entry. Retry the task after the queue clears.',
      createdAt: new Date('2026-03-29T10:35:00.000Z'),
      updatedAt: new Date('2026-03-29T10:36:15.000Z'),
    },
    {
      id: 'agent-task-attempt-demo-report-pending-1',
      taskId: 'agent-task-demo-report-pending',
      attemptNumber: 1,
      status: 'failed',
      triggerSource: 'cron',
      startedAt: new Date('2026-03-30T06:45:00.000Z'),
      completedAt: new Date('2026-03-30T06:46:11.000Z'),
      result: null,
      errorMessage: 'Transient Notion dependency warning while preparing the monthly draft.',
      createdAt: new Date('2026-03-30T06:45:00.000Z'),
      updatedAt: new Date('2026-03-30T06:46:11.000Z'),
    },
  ];

  const auditLogs = [
    {
      id: 'audit-log-demo-agent-task-reschedule',
      action: 'update',
      entityType: 'agent_task',
      entityId: 'agent-task-demo-report-pending',
      userId: null,
      details: JSON.stringify({
        companyId: input.companyId,
        taskAction: 'reschedule',
        taskType: 'draft_monthly_report',
        scheduledAt: '2026-03-30T08:30:00.000Z',
        previousStatus: 'pending',
      }),
      createdAt: new Date('2026-03-30T06:50:00.000Z'),
    },
  ];

  return {
    taskIds: tasks.map((task) => task.id),
    auditLogIds: auditLogs.map((log) => log.id),
    tasks,
    attempts,
    auditLogs,
  };
}

type DemoLedgerRecord = {
  id?: string;
  sourceType: SourceType;
  sourceDocument?: string;
  activityValue: number;
  activityUnit: string;
  transactionDate: Date;
  reportingPeriod: string;
  departmentId: string;
  companyId: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
};

type DemoLedgerPeriod = {
  period: string;
  date: Date;
  multiplier: number;
  isVerified: boolean;
};

const DEMO_LEDGER_HISTORY_MONTHS = 5;
export const DEMO_LEDGER_FUTURE_MONTHS = 2;
const DEMO_LEDGER_MULTIPLIERS = [0.93, 0.96, 0.99, 1.0, 1.04, 1.08, 1.1, 1.12];

function getUtcMonthStart(value: Date | string = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number, dayOfMonth = 1) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, dayOfMonth, 12)
  );
}

function formatDemoPeriod(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function buildDemoLedgerPeriods(
  referenceDate: Date | string = new Date(),
  futureMonths = DEMO_LEDGER_FUTURE_MONTHS
): DemoLedgerPeriod[] {
  const currentMonthStart = getUtcMonthStart(referenceDate);
  const periods: DemoLedgerPeriod[] = [];
  const endOffset = Math.max(0, futureMonths);

  for (let offset = -DEMO_LEDGER_HISTORY_MONTHS; offset <= endOffset; offset += 1) {
    const multiplierIndex = offset + DEMO_LEDGER_HISTORY_MONTHS;
    const date = addUtcMonths(currentMonthStart, offset, 15);

    periods.push({
      period: formatDemoPeriod(date),
      date,
      multiplier:
        DEMO_LEDGER_MULTIPLIERS[multiplierIndex] ??
        roundAmount(1.08 + Math.max(0, multiplierIndex - 5) * 0.02),
      isVerified: offset < 0,
    });
  }

  return periods;
}

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function buildDemoLedgerEntryId(input: {
  companyId: string;
  sourceType: SourceType;
  sourceDocument?: string;
  reportingPeriod: string;
  departmentId: string;
}) {
  const sourceKey =
    input.sourceDocument ||
    `${input.departmentId}-${input.sourceType}-${input.reportingPeriod}`;

  return `demo-ledger-${input.companyId}-${input.sourceType}-${sourceKey}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 190);
}

function createRecord(
  input: Omit<DemoLedgerRecord, 'id' | 'companyId' | 'verified' | 'verifiedBy' | 'verifiedAt'> & {
    companyId?: string;
    verified?: boolean;
  }
): DemoLedgerRecord {
  const verified = input.verified ?? true;
  const companyId = input.companyId || DEMO_COMPANY_ID;

  return {
    ...input,
    id: buildDemoLedgerEntryId({
      companyId,
      sourceType: input.sourceType,
      sourceDocument: input.sourceDocument,
      reportingPeriod: input.reportingPeriod,
      departmentId: input.departmentId,
    }),
    companyId,
    verified,
    verifiedBy: verified ? 'Eco-Loom Admin' : undefined,
    verifiedAt: verified ? new Date(input.transactionDate.getTime() + 86400000) : undefined,
  };
}

export function buildDemoLedgerRecords(
  companyId = DEMO_COMPANY_ID,
  periods = buildDemoLedgerPeriods()
) {
  const entries: DemoLedgerRecord[] = [];

  for (const period of periods) {
    const electricityBase: Record<string, number> = {
      'facility-cascadia': 16800,
      'facility-rotterdam': 12900,
      'facility-berlin': 6100,
      'facility-singapore': 7400,
      'facility-seoul': 8900,
      'facility-monterrey': 15400,
    };

    for (const facility of DEMO_FACILITIES) {
      entries.push(
        createRecord({
          sourceType: 'electricity',
          sourceDocument: `${facility.code.toLowerCase()}_electricity_${period.period}.pdf`,
          activityValue: roundAmount(electricityBase[facility.id] * period.multiplier),
          activityUnit: 'kWh',
          transactionDate: period.date,
          reportingPeriod: period.period,
          departmentId: facility.id,
          companyId,
          verified: period.isVerified,
        })
      );
    }

    const gasBase: Record<string, number> = {
      'facility-cascadia': 980,
      'facility-monterrey': 860,
      'facility-seoul': 290,
    };
    for (const [departmentId, base] of Object.entries(gasBase)) {
      entries.push(
        createRecord({
          sourceType: 'gas',
          sourceDocument: `${departmentId}_gas_${period.period}.pdf`,
          activityValue: roundAmount(base * period.multiplier),
          activityUnit: 'therm',
          transactionDate: period.date,
          reportingPeriod: period.period,
          departmentId,
          companyId,
          verified: period.isVerified,
        })
      );
    }

    const waterBase: Record<string, number> = {
      'facility-cascadia': 240000,
      'facility-singapore': 110000,
      'facility-seoul': 98000,
      'facility-monterrey': 210000,
    };
    for (const [departmentId, base] of Object.entries(waterBase)) {
      entries.push(
        createRecord({
          sourceType: 'water',
          sourceDocument: `${departmentId}_water_${period.period}.pdf`,
          activityValue: roundAmount(base * period.multiplier),
          activityUnit: 'gallons',
          transactionDate: period.date,
          reportingPeriod: period.period,
          departmentId,
          companyId,
          verified: period.isVerified,
        })
      );
    }

    const wasteBase: Record<string, number> = {
      'facility-cascadia': 4200,
      'facility-rotterdam': 3100,
      'facility-singapore': 1800,
      'facility-monterrey': 3600,
    };
    for (const [departmentId, base] of Object.entries(wasteBase)) {
      entries.push(
        createRecord({
          sourceType: 'waste',
          sourceDocument: `${departmentId}_waste_${period.period}.csv`,
          activityValue: roundAmount(base * period.multiplier),
          activityUnit: 'kg (landfill)',
          transactionDate: period.date,
          reportingPeriod: period.period,
          departmentId,
          companyId,
          verified: period.isVerified,
        })
      );
    }

    const shippingBase: Record<string, number> = {
      'facility-rotterdam': 82000,
      'facility-singapore': 36000,
      'facility-monterrey': 54000,
    };
    for (const [departmentId, base] of Object.entries(shippingBase)) {
      entries.push(
        createRecord({
          sourceType: 'shipping',
          sourceDocument: `${departmentId}_freight_${period.period}.csv`,
          activityValue: roundAmount(base * period.multiplier),
          activityUnit: 'kg-km',
          transactionDate: period.date,
          reportingPeriod: period.period,
          departmentId,
          companyId,
          verified: period.isVerified,
        })
      );
    }

    const travelBase: Array<{ departmentId: string; unit: string; value: number }> = [
      { departmentId: 'facility-berlin', unit: 'miles (car)', value: 1400 },
      { departmentId: 'facility-singapore', unit: 'miles (flight)', value: 3200 },
      { departmentId: 'facility-seoul', unit: 'miles (flight)', value: 2100 },
    ];

    for (const travel of travelBase) {
      entries.push(
        createRecord({
          sourceType: 'travel',
          sourceDocument: `${travel.departmentId}_travel_${period.period}.csv`,
          activityValue: roundAmount(travel.value * period.multiplier),
          activityUnit: travel.unit,
          transactionDate: period.date,
          reportingPeriod: period.period,
          departmentId: travel.departmentId,
          companyId,
          verified: period.isVerified,
        })
      );
    }
  }

  return entries;
}

async function buildDemoLedgerCreateManyData(
  client: PrismaClient,
  companyId: string,
  periods = buildDemoLedgerPeriods()
) {
  const factorRecords = await client.emissionFactor.findMany();
  const factorRecordMap = new Map(
    factorRecords.map((record) => [buildEmissionFactorRecordKey(record), record.id])
  );

  return buildDemoLedgerRecords(companyId, periods).map((entry) => {
    const factor = getRequiredEmissionFactor(entry.sourceType, entry.activityUnit);
    return {
      ...entry,
      category: factor.scope,
      emissionFactor: factor.factor,
      emissionFactorUnit: factor.factorUnit,
      emissionFactorId: factorRecordMap.get(buildEmissionFactorRecordKey(factor)) ?? undefined,
      co2Equivalent: roundAmount(entry.activityValue * factor.factor),
      co2Unit: 'kg CO2e',
      ...buildLedgerFactorProvenance(factor),
    };
  });
}

export async function ensureDemoLedgerSeedCoverage(
  client: PrismaClient,
  options?: {
    companyId?: string;
    referenceDate?: Date | string;
    futureMonths?: number;
  }
) {
  const companyId = options?.companyId ?? DEMO_COMPANY_ID;
  if (companyId !== DEMO_COMPANY_ID) {
    return {
      checkedPeriods: [],
      createdPeriods: [],
      createdEntries: 0,
      skippedReason: 'non_demo_company',
    };
  }

  const periods = buildDemoLedgerPeriods(options?.referenceDate, options?.futureMonths);
  const checkedPeriods = periods.map((period) => period.period);

  const demoDepartmentCount = await client.department.count({
    where: {
      companyId,
      id: {
        in: DEMO_FACILITIES.map((facility) => facility.id),
      },
    },
  });

  if (demoDepartmentCount < DEMO_FACILITIES.length) {
    return {
      checkedPeriods,
      createdPeriods: [],
      createdEntries: 0,
      skippedReason: 'missing_demo_departments',
    };
  }

  const existingPeriods = await client.carbonLedgerEntry.findMany({
    where: {
      companyId,
      reportingPeriod: {
        in: checkedPeriods,
      },
    },
    select: {
      reportingPeriod: true,
    },
    distinct: ['reportingPeriod'],
  });
  const existingPeriodSet = new Set(existingPeriods.map((entry) => entry.reportingPeriod));
  const missingPeriods = periods.filter((period) => !existingPeriodSet.has(period.period));

  if (missingPeriods.length === 0) {
    return {
      checkedPeriods,
      createdPeriods: [],
      createdEntries: 0,
    };
  }

  const ledgerEntries = await buildDemoLedgerCreateManyData(client, companyId, missingPeriods);
  await client.carbonLedgerEntry.createMany({
    data: ledgerEntries,
    skipDuplicates: true,
  });

  return {
    checkedPeriods,
    createdPeriods: missingPeriods.map((period) => period.period),
    createdEntries: ledgerEntries.length,
  };
}

export function buildDemoGoals(companyId = DEMO_COMPANY_ID) {
  return DEMO_GOALS.map((goal) => ({
    ...goal,
    companyId,
  }));
}

export function buildDemoReports(companyId = DEMO_COMPANY_ID) {
  return DEMO_REPORTS.map((report) => ({
    ...report,
    companyId,
    reportingStandard: DEMO_COMPANY.defaultReportingStandard,
    gwpBasis: DEMO_COMPANY.defaultGwpBasis,
    factorSourcePolicy: DEMO_COMPANY.defaultFactorSourcePolicy,
    overridePolicy: DEMO_COMPANY.defaultOverridePolicy,
    reportOwnerName: DEMO_COMPANY.defaultReportOwnerName,
    reportOwnerEmail: DEMO_COMPANY.defaultReportOwnerEmail,
    reportRecipients: DEMO_COMPANY.defaultReportRecipients,
    approvalWorkflow: DEMO_COMPANY.defaultApprovalWorkflow,
    organizationalBoundaryMethod: DEMO_COMPANY.defaultOrganizationalBoundaryMethod,
    organizationalBoundaryNotes: DEMO_COMPANY.defaultOrganizationalBoundaryNotes,
    baseYear: DEMO_COMPANY.defaultBaseYear,
    baseYearNotes: DEMO_COMPANY.defaultBaseYearNotes,
    baseYearRecalculationPolicy: DEMO_COMPANY.defaultBaseYearRecalculationPolicy,
    scope2Method: DEMO_COMPANY.defaultScope2Method,
    scope2DisclosureNotes: DEMO_COMPANY.annualDisclosureNotes,
  }));
}

export function buildDemoDepartments(companyId = DEMO_COMPANY_ID) {
  return DEMO_FACILITIES.map((facility) => ({
    ...facility,
    companyId,
  }));
}

async function createDemoDepartments(client: PrismaClient, companyId: string) {
  const facilities = buildDemoDepartments(companyId);

  try {
    await client.department.createMany({
      data: facilities,
    });
    return;
  } catch (error) {
    if (!isFacilityMetadataValidationError(error)) {
      throw error;
    }

    console.warn(
      'Facility metadata fields are unavailable on the active Prisma client during demo seeding. Retrying with raw inserts.'
    );
  }

  for (const facility of facilities) {
    const createdAt = new Date();
    const updatedAt = new Date();
    await client.$executeRaw(
      Prisma.sql`
        INSERT INTO "public"."Department" (
          "id",
          "name",
          "code",
          "budget",
          "locationDetail",
          "address",
          "country",
          "facilityType",
          "companyId",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${facility.id},
          ${facility.name},
          ${facility.code},
          ${facility.budget},
          ${facility.locationDetail},
          ${facility.address},
          ${facility.country},
          ${facility.facilityType},
          ${facility.companyId},
          ${createdAt},
          ${updatedAt}
        )
      `
    );
  }
}

async function createDemoAutomationHistory(client: PrismaClient, companyId: string) {
  const sampleEntry = await client.carbonLedgerEntry.findFirst({
    where: { companyId },
    orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  });

  const automationHistory = buildDemoAutomationHistory({
    companyId,
    sampleEntryId: sampleEntry?.id ?? null,
  });

  await client.auditLog.deleteMany({
    where: {
      id: {
        in: automationHistory.auditLogIds,
      },
    },
  });

  await client.agentTask.deleteMany({
    where: {
      id: {
        in: automationHistory.taskIds,
      },
    },
  });

  await client.agentTask.createMany({
    data: automationHistory.tasks,
  });

  await client.agentTaskAttempt.createMany({
    data: automationHistory.attempts,
  });

  await client.auditLog.createMany({
    data: automationHistory.auditLogs,
  });

  return {
    tasks: automationHistory.tasks.length,
    attempts: automationHistory.attempts.length,
  };
}

function isFacilityMetadataValidationError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientValidationError)) {
    return false;
  }

  return ['locationDetail', 'address', 'country', 'facilityType'].some((field) =>
    error.message.includes(field)
  );
}

export async function countDemoWorkspaceData(client: PrismaClient) {
  const [companyCount, facilityCount, ledgerCount, goalCount, reportCount, emissionFactorCount] =
    await client.$transaction([
      client.company.count({ where: { id: DEMO_COMPANY_ID } }),
      client.department.count({ where: { companyId: DEMO_COMPANY_ID } }),
      client.carbonLedgerEntry.count({ where: { companyId: DEMO_COMPANY_ID } }),
      client.sustainabilityGoal.count({ where: { companyId: DEMO_COMPANY_ID } }),
      client.report.count({ where: { companyId: DEMO_COMPANY_ID } }),
      client.emissionFactor.count(),
    ]);

  return {
    companies: companyCount,
    departments: facilityCount,
    ledgerEntries: ledgerCount,
    goals: goalCount,
    reports: reportCount,
    emissionFactors: emissionFactorCount,
  };
}

export async function seedDemoWorkspace(
  client: PrismaClient,
  options?: {
    clearExisting?: boolean;
  }
) {
  const clearExisting = options?.clearExisting ?? false;

  if (clearExisting) {
    const existingDemoTaskIds = (
      await client.agentTask.findMany({
        where: {
          payload: {
            contains: `"companyId":"${DEMO_COMPANY_ID}"`,
          },
        },
        select: {
          id: true,
        },
      })
    ).map((task) => task.id);

    if (existingDemoTaskIds.length > 0) {
      await client.auditLog.deleteMany({
        where: {
          entityType: 'agent_task',
          entityId: {
            in: existingDemoTaskIds,
          },
        },
      });
    }

    await client.agentTask.deleteMany({
      where: {
        payload: {
          contains: `"companyId":"${DEMO_COMPANY_ID}"`,
        },
      },
    });
    await client.carbonLedgerEntry.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
    await client.sustainabilityGoal.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
    await client.report.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
    await client.department.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
    await client.notionConfig.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
  }

  const company = await client.company.upsert({
    where: { id: DEMO_COMPANY_ID },
    update: DEMO_COMPANY,
    create: {
      id: DEMO_COMPANY_ID,
      ...DEMO_COMPANY,
    },
  });

  await createDemoDepartments(client, company.id);

  await client.sustainabilityGoal.createMany({
    data: buildDemoGoals(company.id),
  });

  const emissionFactorSeeds = buildEmissionFactorSeedData();
  for (const factor of emissionFactorSeeds) {
    const existingFactor = await client.emissionFactor.findFirst({
      where: {
        sourceType: factor.sourceType,
        activityUnit: factor.activityUnit,
        region: factor.region ?? null,
        year: factor.year,
      },
      select: { id: true },
    });

    if (existingFactor) {
      await client.emissionFactor.update({
        where: { id: existingFactor.id },
        data: {
          factor: factor.factor,
          factorUnit: factor.factorUnit,
          source: factor.source,
          sourceFamily: factor.sourceFamily,
          methodology: factor.methodology,
          gwpBasis: factor.gwpBasis,
          description: factor.description,
        },
      });
      continue;
    }

    await client.emissionFactor.create({ data: factor });
  }
  const ledgerEntries = await buildDemoLedgerCreateManyData(client, company.id);

  await client.carbonLedgerEntry.createMany({
    data: ledgerEntries,
  });

  await client.report.createMany({
    data: buildDemoReports(company.id),
  });

  await client.notionConfig.upsert({
    where: { companyId: company.id },
    update: {
      workspaceName: DEMO_NOTION_CONFIG.workspaceName,
      syncEnabled: DEMO_NOTION_CONFIG.syncEnabled,
      lastSyncAt: DEMO_NOTION_CONFIG.lastSyncAt,
    },
    create: {
      ...DEMO_NOTION_CONFIG,
      companyId: company.id,
    },
  });

  const automationSummary = await createDemoAutomationHistory(client, company.id);

  return {
    company: company.name,
    departments: DEMO_FACILITIES.length,
    ledgerEntries: ledgerEntries.length,
    goals: DEMO_GOALS.length,
    reports: DEMO_REPORTS.length,
    emissionFactors: emissionFactorSeeds.length,
    automationTasks: automationSummary.tasks,
    automationAttempts: automationSummary.attempts,
  };
}
