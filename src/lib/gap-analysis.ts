import type {
  GapAnalysis,
  GapAnalysisAreaItem,
  GapAnalysisGoalItem,
  GapAnalysisIssueItem,
  GapAnalysisUnitTotal,
  GapSeverity,
  GoalStatus,
  GoalType,
  StoredGapItem,
} from '@/lib/types';
import { formatCo2e } from '@/lib/utils';

type GapAnalysisOptions = {
  totalEmissions?: number;
  verifiedEmissions?: number;
  verificationRate?: number;
};

type GoalForGapAnalysis = {
  title: string;
  goalType: GoalType | string;
  departmentId?: string | null;
  department?: { name: string } | null;
  status: GoalStatus | string;
  progressPercent: number;
  currentValue: number;
  targetValue: number;
  targetUnit?: string | null;
  baselineValue?: number | null;
};

const CO2E_UNIT_PATTERN = /co2/i;

function isGoalStatus(value: unknown): value is GoalStatus {
  return value === 'on_track' || value === 'at_risk' || value === 'achieved' || value === 'missed';
}

function isGoalType(value: unknown): value is GoalType {
  return (
    value === 'emission_reduction' ||
    value === 'renewable_energy' ||
    value === 'waste_reduction' ||
    value === 'water_conservation' ||
    value === 'carbon_neutral' ||
    value === 'other'
  );
}

function isGapSeverity(value: unknown): value is GapSeverity {
  return value === 'low' || value === 'medium' || value === 'high';
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeUnit(value: string | null | undefined, fallback = 'units') {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function inferGoalDirection(goal: Pick<GoalForGapAnalysis, 'goalType' | 'baselineValue' | 'targetValue'>) {
  if (
    typeof goal.baselineValue === 'number' &&
    Number.isFinite(goal.baselineValue) &&
    goal.baselineValue !== goal.targetValue
  ) {
    return goal.targetValue < goal.baselineValue ? 'decrease' : 'increase';
  }

  return goal.goalType === 'emission_reduction' || goal.goalType === 'carbon_neutral'
    ? 'decrease'
    : 'increase';
}

export function formatGapValue(value: number, unit: string) {
  if (CO2E_UNIT_PATTERN.test(unit)) {
    return formatCo2e(value);
  }

  const formattedValue = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);

  return `${formattedValue} ${unit}`.trim();
}

function buildGoalGapSummary(
  gapValue: number,
  gapUnit: string,
  relation: GapAnalysisGoalItem['relation'],
  progress: number
) {
  if (gapValue <= 0) {
    return `This goal is currently on plan. Progress so far: ${progress.toFixed(1)}%.`;
  }

  const relationLabel = relation === 'above_target' ? 'above the target' : 'below the target';
  return `Still ${formatGapValue(gapValue, gapUnit)} ${relationLabel}. Progress so far: ${progress.toFixed(1)}%.`;
}

function determineGapSeverity(
  status: GoalStatus,
  progress: number,
  gapValue: number,
  targetValue: number
): GapSeverity {
  if (status === 'at_risk') {
    const normalizedGap = targetValue > 0 ? gapValue / Math.abs(targetValue) : 0;
    if (normalizedGap >= 0.25 || progress < 35) {
      return 'high';
    }
    return 'medium';
  }

  return gapValue > 0 ? 'low' : 'low';
}

export function buildGoalGapItem(goal: GoalForGapAnalysis): GapAnalysisGoalItem {
  const normalizedGoalType = isGoalType(goal.goalType) ? goal.goalType : 'other';
  const normalizedStatus = isGoalStatus(goal.status) ? goal.status : 'on_track';
  const direction = inferGoalDirection(goal);
  const gapUnit = normalizeUnit(goal.targetUnit, 'units');
  const currentValue = safeNumber(goal.currentValue);
  const targetValue = safeNumber(goal.targetValue);
  const progress = safeNumber(goal.progressPercent);
  const gapValue =
    direction === 'decrease'
      ? Math.max(0, currentValue - targetValue)
      : Math.max(0, targetValue - currentValue);

  const relation =
    gapValue <= 0
      ? 'on_target'
      : direction === 'decrease'
        ? 'above_target'
        : 'below_target';

  return {
    kind: 'goal',
    goal: goal.title,
    goalType: normalizedGoalType,
    department: goal.department?.name || 'Company-wide',
    departmentId: goal.departmentId || null,
    status: normalizedStatus,
    progress,
    currentValue,
    currentUnit: gapUnit,
    targetValue,
    targetUnit: gapUnit,
    baselineValue: goal.baselineValue ?? null,
    gapValue,
    gapUnit,
    direction,
    relation,
    severity: determineGapSeverity(normalizedStatus, progress, gapValue, targetValue),
    summary: buildGoalGapSummary(gapValue, gapUnit, relation, progress),
  };
}

export function buildGapAnalysisGoalItems(goals: GoalForGapAnalysis[]) {
  return goals
    .filter((goal) => goal.status === 'at_risk' || goal.status === 'on_track')
    .map(buildGoalGapItem)
    .filter((item) => item.gapValue > 0);
}

function compareGapItems(a: GapAnalysisGoalItem, b: GapAnalysisGoalItem) {
  const severityScore = { high: 3, medium: 2, low: 1 } as const;
  const severityDelta = severityScore[b.severity] - severityScore[a.severity];
  if (severityDelta !== 0) {
    return severityDelta;
  }

  const aGapRatio = a.targetValue > 0 ? a.gapValue / Math.abs(a.targetValue) : 0;
  const bGapRatio = b.targetValue > 0 ? b.gapValue / Math.abs(b.targetValue) : 0;
  if (bGapRatio !== aGapRatio) {
    return bGapRatio - aGapRatio;
  }

  return b.gapValue - a.gapValue;
}

function buildGapTotalsByUnit(items: GapAnalysisGoalItem[]): GapAnalysisUnitTotal[] {
  const totals = new Map<string, { total: number; itemCount: number }>();

  for (const item of items) {
    const current = totals.get(item.gapUnit) || { total: 0, itemCount: 0 };
    totals.set(item.gapUnit, {
      total: current.total + item.gapValue,
      itemCount: current.itemCount + 1,
    });
  }

  return Array.from(totals.entries())
    .map(([unit, total]) => ({
      unit,
      total: Math.round(total.total * 100) / 100,
      itemCount: total.itemCount,
      label: `${formatGapValue(total.total, unit)} across ${total.itemCount} open goal${
        total.itemCount === 1 ? '' : 's'
      }`,
    }))
    .sort((a, b) => b.itemCount - a.itemCount || b.total - a.total);
}

export function buildGapAnalysisOverview(
  goals: GoalForGapAnalysis[],
  options: GapAnalysisOptions = {}
): GapAnalysis {
  const goalsAtRisk = goals.filter((goal) => goal.status === 'at_risk').length;
  const goalsOnTrack = goals.filter((goal) => goal.status === 'on_track').length;
  const goalsAchieved = goals.filter((goal) => goal.status === 'achieved').length;
  const openGoalGaps = buildGapAnalysisGoalItems(goals);
  const topGaps = [...openGoalGaps].sort(compareGapItems).slice(0, 3);
  const gapTotalsByUnit = buildGapTotalsByUnit(openGoalGaps);
  const legacyTotalGap = gapTotalsByUnit.length === 1 ? gapTotalsByUnit[0].total : 0;

  return {
    goalsAtRisk,
    goalsOnTrack,
    goalsAchieved,
    totalGap: legacyTotalGap,
    totalGoals: goals.length,
    totalEmissions:
      typeof options.totalEmissions === 'number'
        ? Math.round(options.totalEmissions * 100) / 100
        : undefined,
    verifiedEmissions:
      typeof options.verifiedEmissions === 'number'
        ? Math.round(options.verifiedEmissions * 100) / 100
        : undefined,
    verificationRate:
      typeof options.verificationRate === 'number'
        ? Math.round(options.verificationRate * 10) / 10
        : undefined,
    activeGapCount: openGoalGaps.length,
    gapTotalsByUnit,
    topGaps,
    largestGap: topGaps[0] || null,
  };
}

function normalizeStructuredGoal(item: Record<string, unknown>): GapAnalysisGoalItem | null {
  if (typeof item.goal !== 'string') {
    return null;
  }

  const targetUnit = normalizeUnit(
    typeof item.targetUnit === 'string'
      ? item.targetUnit
      : typeof item.gapUnit === 'string'
        ? item.gapUnit
        : undefined,
    'units'
  );
  const progress = safeNumber(item.progress, 0);
  const targetValue = safeNumber(item.targetValue, 0);
  const currentValue = safeNumber(item.currentValue, 0);
  const gapValue = safeNumber(item.gapValue, 0);
  const status = isGoalStatus(item.status) ? item.status : 'on_track';
  const direction =
    item.direction === 'decrease' || item.direction === 'increase'
      ? item.direction
      : 'increase';
  const relation =
    item.relation === 'above_target' ||
    item.relation === 'below_target' ||
    item.relation === 'on_target'
      ? item.relation
      : gapValue > 0
        ? direction === 'decrease'
          ? 'above_target'
          : 'below_target'
        : 'on_target';

  return {
    kind: 'goal',
    goal: item.goal,
    goalType: isGoalType(item.goalType) ? item.goalType : 'other',
    department: typeof item.department === 'string' ? item.department : 'Company-wide',
    departmentId: typeof item.departmentId === 'string' ? item.departmentId : null,
    status,
    progress,
    currentValue,
    currentUnit: normalizeUnit(
      typeof item.currentUnit === 'string' ? item.currentUnit : targetUnit,
      targetUnit
    ),
    targetValue,
    targetUnit,
    baselineValue:
      typeof item.baselineValue === 'number' && Number.isFinite(item.baselineValue)
        ? item.baselineValue
        : null,
    gapValue,
    gapUnit: normalizeUnit(typeof item.gapUnit === 'string' ? item.gapUnit : targetUnit, targetUnit),
    direction,
    relation,
    severity: isGapSeverity(item.severity)
      ? item.severity
      : determineGapSeverity(status, progress, gapValue, targetValue),
    summary:
      typeof item.summary === 'string'
        ? item.summary
        : buildGoalGapSummary(gapValue, targetUnit, relation, progress),
  };
}

function normalizeLegacyIssue(item: Record<string, unknown>): GapAnalysisIssueItem | null {
  if (typeof item.facility !== 'string' || typeof item.issue !== 'string') {
    return null;
  }

  const severity = isGapSeverity(item.severity) ? item.severity : 'medium';

  return {
    kind: 'issue',
    facility: item.facility,
    issue: item.issue,
    severity,
    summary: `${item.issue} at ${item.facility}.`,
  };
}

function normalizeLegacyArea(item: Record<string, unknown>): GapAnalysisAreaItem | null {
  if (typeof item.area !== 'string') {
    return null;
  }

  const severity = isGapSeverity(item.severity) ? item.severity : 'medium';
  const gapValue = safeNumber(item.gap, 0);
  const gapUnit = normalizeUnit(typeof item.unit === 'string' ? item.unit : undefined, 'units');

  return {
    kind: 'area',
    area: item.area,
    gapValue,
    gapUnit,
    severity,
    summary:
      gapValue > 0
        ? `${formatGapValue(gapValue, gapUnit)} gap recorded for ${item.area}.`
        : `Gap analysis note for ${item.area}.`,
  };
}

function normalizeLegacyGoal(item: Record<string, unknown>): GapAnalysisGoalItem | null {
  if (typeof item.goal !== 'string') {
    return null;
  }

  const progress = safeNumber(item.progress, 0);
  const targetValue = safeNumber(item.target, 100);
  const gapValue = Math.max(0, targetValue - progress);
  const status = isGoalStatus(item.status) ? item.status : 'on_track';

  return {
    kind: 'goal',
    goal: item.goal,
    goalType: isGoalType(item.goalType) ? item.goalType : 'other',
    department: typeof item.department === 'string' ? item.department : 'Company-wide',
    departmentId: typeof item.departmentId === 'string' ? item.departmentId : null,
    status,
    progress,
    currentValue: progress,
    currentUnit: '%',
    targetValue,
    targetUnit: '%',
    baselineValue: null,
    gapValue,
    gapUnit: '%',
    direction: 'increase',
    relation: gapValue > 0 ? 'below_target' : 'on_target',
    severity: determineGapSeverity(status, progress, gapValue, targetValue),
    summary: `Still ${gapValue.toFixed(1)} percentage points short of the legacy target snapshot.`,
  };
}

export function parseStoredGapItems(raw: string | null | undefined): StoredGapItem[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const candidate = item as Record<string, unknown>;

        if (
          typeof candidate.goal === 'string' &&
          (typeof candidate.gapValue === 'number' ||
            typeof candidate.currentValue === 'number' ||
            typeof candidate.targetValue === 'number')
        ) {
          return normalizeStructuredGoal(candidate);
        }

        if (typeof candidate.goal === 'string') {
          return normalizeLegacyGoal(candidate);
        }

        if (typeof candidate.facility === 'string' && typeof candidate.issue === 'string') {
          return normalizeLegacyIssue(candidate);
        }

        if (typeof candidate.area === 'string') {
          return normalizeLegacyArea(candidate);
        }

        return null;
      })
      .filter((item): item is StoredGapItem => item !== null);
  } catch {
    return [];
  }
}
