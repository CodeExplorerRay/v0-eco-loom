// Sync Service - Synchronizes ledger entries with goals
import { db } from '@/lib/db';
import type {
  DepartmentEmissions,
  EmissionsByCategory,
  EmissionsByCategoryBreakdownItem,
} from '@/lib/types';

type DashboardScope = {
  companyId: string;
  departmentId?: string | null;
};

type ScopeCategoryKey = 'scope1' | 'scope2' | 'scope3';

type LedgerEntrySnapshot = {
  departmentId?: string | null;
  category: string;
  co2Equivalent: number;
  verified: boolean;
  transactionDate: Date;
};

type DepartmentSnapshot = {
  id: string;
  name: string;
  code: string;
  country: string | null;
};

type MonthlyWindow = {
  start: Date;
  end: Date;
  period: string;
  label: string;
};

const CATEGORY_CONFIG: Record<
  ScopeCategoryKey,
  Pick<EmissionsByCategoryBreakdownItem, 'name' | 'color' | 'description'>
> = {
  scope1: {
    name: 'Scope 1',
    color: '#16a34a',
    description: 'Direct emissions from fuel, fleet, and onsite operations.',
  },
  scope2: {
    name: 'Scope 2',
    color: '#0ea5e9',
    description: 'Indirect emissions from purchased electricity, steam, heating, or cooling.',
  },
  scope3: {
    name: 'Scope 3',
    color: '#f59e0b',
    description: 'Value-chain emissions such as travel, freight, waste, and purchased goods.',
  },
};

function buildEntryWhere(scope: DashboardScope) {
  return {
    companyId: scope.companyId,
    ...(scope.departmentId ? { departmentId: scope.departmentId } : {}),
  };
}

function buildGoalWhere(scope: DashboardScope) {
  if (!scope.departmentId) {
    return { companyId: scope.companyId };
  }

  return {
    companyId: scope.companyId,
    OR: [{ departmentId: scope.departmentId }, { departmentId: null }],
  };
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function getScopeCategoryKey(category: string): ScopeCategoryKey | null {
  const normalized = category.trim().toLowerCase().replace(/[\s_-]+/g, '');

  if (normalized === 'scope1') {
    return 'scope1';
  }

  if (normalized === 'scope2') {
    return 'scope2';
  }

  if (normalized === 'scope3') {
    return 'scope3';
  }

  return null;
}

function buildMonthlyWindowFromDate(date: Date): MonthlyWindow {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));

  return {
    start,
    end,
    period: `${year}-${String(month + 1).padStart(2, '0')}`,
    label: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(start),
  };
}

function getCurrentMonthlyWindow(referenceDate = new Date()) {
  return buildMonthlyWindowFromDate(referenceDate);
}

function getPreviousMonthlyWindow(window: MonthlyWindow) {
  return buildMonthlyWindowFromDate(
    new Date(
      Date.UTC(window.start.getUTCFullYear(), window.start.getUTCMonth() - 1, 1)
    )
  );
}

function getEntriesInWindow(entries: LedgerEntrySnapshot[], window: MonthlyWindow) {
  return entries.filter((entry) => {
    const timestamp = entry.transactionDate.getTime();
    return timestamp >= window.start.getTime() && timestamp < window.end.getTime();
  });
}

function sumScopeTotals(entries: Array<Pick<LedgerEntrySnapshot, 'category' | 'co2Equivalent'>>) {
  const totals: Record<ScopeCategoryKey, number> = {
    scope1: 0,
    scope2: 0,
    scope3: 0,
  };

  for (const entry of entries) {
    const key = getScopeCategoryKey(entry.category);
    if (!key) {
      continue;
    }

    totals[key] += Number.isFinite(entry.co2Equivalent) ? entry.co2Equivalent : 0;
  }

  return {
    scope1Total: roundToTwo(totals.scope1),
    scope2Total: roundToTwo(totals.scope2),
    scope3Total: roundToTwo(totals.scope3),
    totalEmissions: roundToTwo(totals.scope1 + totals.scope2 + totals.scope3),
  };
}

function buildEmissionsByCategorySnapshot(
  entries: LedgerEntrySnapshot[],
  window: MonthlyWindow | null
): EmissionsByCategory {
  const aggregates: Record<
    ScopeCategoryKey,
    { total: number; verified: number; unverified: number; entryCount: number }
  > = {
    scope1: { total: 0, verified: 0, unverified: 0, entryCount: 0 },
    scope2: { total: 0, verified: 0, unverified: 0, entryCount: 0 },
    scope3: { total: 0, verified: 0, unverified: 0, entryCount: 0 },
  };

  for (const entry of entries) {
    const key = getScopeCategoryKey(entry.category);
    if (!key) {
      continue;
    }

    const amount = Number.isFinite(entry.co2Equivalent) ? entry.co2Equivalent : 0;
    aggregates[key].total += amount;
    aggregates[key].entryCount += 1;

    if (entry.verified) {
      aggregates[key].verified += amount;
    } else {
      aggregates[key].unverified += amount;
    }
  }

  const total = Object.values(aggregates).reduce((sum, item) => sum + item.total, 0);
  const verifiedTotal = Object.values(aggregates).reduce((sum, item) => sum + item.verified, 0);
  const unverifiedTotal = Math.max(0, total - verifiedTotal);
  const entryCount = Object.values(aggregates).reduce((sum, item) => sum + item.entryCount, 0);

  const breakdown: EmissionsByCategoryBreakdownItem[] = (Object.keys(CATEGORY_CONFIG) as ScopeCategoryKey[]).map(
    (key) => {
      const aggregate = aggregates[key];
      const config = CATEGORY_CONFIG[key];
      const share = total > 0 ? (aggregate.total / total) * 100 : 0;

      return {
        key,
        name: config.name,
        value: roundToTwo(aggregate.total),
        share: roundToTwo(share),
        verifiedValue: roundToTwo(aggregate.verified),
        unverifiedValue: roundToTwo(aggregate.unverified),
        entryCount: aggregate.entryCount,
        color: config.color,
        description: config.description,
      };
    }
  );

  return {
    scope1: roundToTwo(aggregates.scope1.total),
    scope2: roundToTwo(aggregates.scope2.total),
    scope3: roundToTwo(aggregates.scope3.total),
    total: roundToTwo(total),
    verifiedTotal: roundToTwo(verifiedTotal),
    unverifiedTotal: roundToTwo(unverifiedTotal),
    verificationRate: total > 0 ? roundToTwo((verifiedTotal / total) * 100) : 0,
    period: window?.period || '',
    periodLabel: window?.label || '',
    entryCount,
    breakdown,
  };
}

function buildDepartmentComparisonSnapshot(
  departments: DepartmentSnapshot[],
  entries: LedgerEntrySnapshot[],
  window: MonthlyWindow | null,
  selectedDepartmentId?: string | null
): DepartmentEmissions[] {
  const totalEmissions = entries.reduce((sum, entry) => sum + entry.co2Equivalent, 0);

  return departments
    .map((department) => {
      const facilityEntries = entries.filter((entry) => entry.departmentId === department.id);
      const emissions = facilityEntries.reduce((sum, entry) => sum + entry.co2Equivalent, 0);
      const verifiedEntries = facilityEntries.filter((entry) => entry.verified);
      const verifiedEmissions = verifiedEntries.reduce(
        (sum, entry) => sum + entry.co2Equivalent,
        0
      );
      const entryCount = facilityEntries.length;

      return {
        id: department.id,
        name: department.name,
        code: department.code,
        country: department.country,
        emissions: roundToTwo(emissions),
        percent: totalEmissions > 0 ? roundToTwo((emissions / totalEmissions) * 100) : 0,
        entryCount,
        verifiedEntries: verifiedEntries.length,
        verifiedEmissions: roundToTwo(verifiedEmissions),
        unverifiedEmissions: roundToTwo(Math.max(0, emissions - verifiedEmissions)),
        verificationRate:
          emissions > 0 ? roundToTwo((verifiedEmissions / emissions) * 100) : 0,
        period: window?.period || '',
        periodLabel: window?.label || '',
        isSelected: selectedDepartmentId === department.id,
      };
    })
    .sort((a, b) => b.emissions - a.emissions || a.name.localeCompare(b.name));
}

type EmissionsBudgetGoalLike = {
  departmentId?: string | null;
  targetValue: number;
  targetUnit?: string | null;
  targetYear?: number | null;
};

function convertGoalTargetToAnnualKgCo2e(goal: EmissionsBudgetGoalLike): number | null {
  if (!Number.isFinite(goal.targetValue) || goal.targetValue <= 0) {
    return null;
  }

  const normalizedUnit = goal.targetUnit?.toLowerCase().replace(/\s+/g, ' ') ?? '';

  if (!normalizedUnit.includes('co2')) {
    return null;
  }

  if (normalizedUnit.includes('%')) {
    return null;
  }

  if (
    normalizedUnit.includes('tco2e') ||
    normalizedUnit.includes('metric ton') ||
    normalizedUnit.includes('ton co2e') ||
    normalizedUnit.includes('tonne co2e')
  ) {
    return goal.targetValue * 1000;
  }

  if (
    normalizedUnit.includes('kg co2e') ||
    (normalizedUnit.includes('co2e') && normalizedUnit.includes('kg'))
  ) {
    return goal.targetValue;
  }

  return null;
}

function rankBudgetGoal(goal: EmissionsBudgetGoalLike) {
  const currentYear = new Date().getUTCFullYear();
  const targetYearDistance =
    typeof goal.targetYear === 'number' ? Math.abs(goal.targetYear - currentYear) : 999;
  return targetYearDistance;
}

export function resolveAnnualEmissionsBudgetTarget(
  goals: EmissionsBudgetGoalLike[],
  departmentId?: string | null
): number | null {
  const eligibleGoals = goals
    .map((goal) => ({
      goal,
      annualTargetKgCo2e: convertGoalTargetToAnnualKgCo2e(goal),
    }))
    .filter(
      (candidate): candidate is { goal: EmissionsBudgetGoalLike; annualTargetKgCo2e: number } =>
        candidate.annualTargetKgCo2e !== null
    );

  const departmentScoped =
    departmentId
      ? eligibleGoals
          .filter((candidate) => candidate.goal.departmentId === departmentId)
          .sort((a, b) => rankBudgetGoal(a.goal) - rankBudgetGoal(b.goal))[0]
      : null;

  if (departmentScoped) {
    return departmentScoped.annualTargetKgCo2e;
  }

  const companyWide = eligibleGoals
    .filter((candidate) => !candidate.goal.departmentId)
    .sort((a, b) => rankBudgetGoal(a.goal) - rankBudgetGoal(b.goal))[0];

  return companyWide?.annualTargetKgCo2e ?? null;
}

// Update goal progress based on actual emissions data
export async function recalculateGoalProgress(companyId: string) {
  try {
    // Get all ledger entries for the company
    const entries = await db.carbonLedgerEntry.findMany({
      where: { companyId, verified: true },
    });

    // Calculate totals by category
    const scope1Total = entries
      .filter(e => e.category === 'Scope 1')
      .reduce((sum, e) => sum + e.co2Equivalent, 0);
    
    const scope2Total = entries
      .filter(e => e.category === 'Scope 2')
      .reduce((sum, e) => sum + e.co2Equivalent, 0);
    
    const scope3Total = entries
      .filter(e => e.category === 'Scope 3')
      .reduce((sum, e) => sum + e.co2Equivalent, 0);
    
    const totalEmissions = scope1Total + scope2Total + scope3Total;

    // Get all goals for the company
    const goals = await db.sustainabilityGoal.findMany({
      where: { companyId },
    });

    const updates: { goalId: string; title: string; progress: number; status: string }[] = [];

    for (const goal of goals) {
      let currentValue = 0;
      let progressPercent = 0;
      let status: 'on_track' | 'at_risk' | 'achieved' | 'missed' = 'on_track';

      switch (goal.goalType) {
        case 'carbon_neutral':
          // For carbon neutrality, track total emissions vs baseline
          currentValue = totalEmissions;
          if (goal.baselineValue) {
            // Progress toward zero emissions
            progressPercent = Math.max(0, Math.min(100, 
              ((goal.baselineValue - totalEmissions) / goal.baselineValue) * 100
            ));
          }
          status = progressPercent >= 100 ? 'achieved' : progressPercent >= 50 ? 'on_track' : 'at_risk';
          break;

        case 'emission_reduction':
          // For emission reduction goals
          if (goal.departmentId) {
            // Department-specific goal - calculate department emissions
            const deptEntries = entries.filter(e => e.departmentId === goal.departmentId);
            currentValue = deptEntries.reduce((sum, e) => sum + e.co2Equivalent, 0);
          } else {
            // Company-wide goals should evaluate the full verified inventory, not Scope 1 alone.
            currentValue = totalEmissions;
          }
          
          if (goal.baselineValue && goal.baselineValue > goal.targetValue) {
            // Reduction goal: progress is how much we've reduced
            const reduction = goal.baselineValue - currentValue;
            const targetReduction = goal.baselineValue - goal.targetValue;
            progressPercent = Math.max(0, Math.min(100, (reduction / targetReduction) * 100));
          } else {
            // Simple target goal
            progressPercent = Math.max(0, Math.min(100, (currentValue / goal.targetValue) * 100));
          }
          
          status = progressPercent >= 100 ? 'achieved' : progressPercent >= 70 ? 'on_track' : 'at_risk';
          break;

        case 'renewable_energy':
          // For renewable energy goals (percentage-based)
          // Use Scope 2 as proxy for electricity, assume progress from entries
          currentValue = goal.currentValue; // Keep manual updates for renewable energy
          progressPercent = goal.progressPercent;
          status = progressPercent >= 100 ? 'achieved' : progressPercent >= 70 ? 'on_track' : 'at_risk';
          break;

        case 'waste_reduction':
        case 'water_conservation':
          // For these goals, use current progress but allow recalculation
          currentValue = goal.currentValue;
          progressPercent = goal.progressPercent;
          status = progressPercent >= 100 ? 'achieved' : progressPercent >= 70 ? 'on_track' : 'at_risk';
          break;

        default:
          currentValue = goal.currentValue;
          progressPercent = goal.progressPercent;
      }

      // Update the goal
      await db.sustainabilityGoal.update({
        where: { id: goal.id },
        data: {
          currentValue,
          progressPercent: Math.round(progressPercent * 10) / 10,
          status,
        },
      });

      updates.push({
        goalId: goal.id,
        title: goal.title,
        progress: Math.round(progressPercent * 10) / 10,
        status,
      });
    }

    return { success: true, updates };
  } catch (error) {
    console.error('Error recalculating goal progress:', error);
    return { success: false, error: 'Failed to recalculate goals' };
  }
}

// Get dashboard metrics with fallback
export async function getDashboardMetrics(companyId: string, departmentId?: string | null) {
  try {
    const allEntries = await db.carbonLedgerEntry.findMany({
      where: buildEntryWhere({ companyId, departmentId }),
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    });

    const currentWindow = getCurrentMonthlyWindow();
    const previousWindow = getPreviousMonthlyWindow(currentWindow);

    const currentEntries = getEntriesInWindow(allEntries, currentWindow);
    const previousEntries = getEntriesInWindow(allEntries, previousWindow);

    const totalCo2eThisMonth = currentEntries.reduce((sum, e) => sum + e.co2Equivalent, 0);
    const totalCo2ePreviousMonth = previousEntries.reduce((sum, e) => sum + e.co2Equivalent, 0);
    const { scope1Total, scope2Total, scope3Total, totalEmissions } =
      sumScopeTotals(currentEntries);

    // Get goals
    const goals = await db.sustainabilityGoal.findMany({
      where: buildGoalWhere({ companyId, departmentId }),
    });

    const goalsOnTrack = goals.filter(g => g.status === 'on_track' || g.status === 'achieved').length;
    const complianceScore = goals.length > 0 ? Math.round((goalsOnTrack / goals.length) * 100) : 100;

    // Get departments
    const departments = await db.department.findMany({
      where: departmentId
        ? {
            companyId,
            id: departmentId,
          }
        : { companyId },
    });

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercent = 0;
    if (totalCo2ePreviousMonth > 0) {
      const change = ((totalCo2ePreviousMonth - totalCo2eThisMonth) / totalCo2ePreviousMonth) * 100;
      trendPercent = Math.abs(change);
      trend = change > 1 ? 'down' : change < -1 ? 'up' : 'stable';
    }

    // Get target from goals
    const targetEmissions = resolveAnnualEmissionsBudgetTarget(goals, departmentId) || 150000;
    const monthlyTarget = targetEmissions / 12;
    const emissionsVsTarget = monthlyTarget > 0 ? (totalCo2eThisMonth / monthlyTarget) * 100 : 0;

    return {
      totalCo2eThisMonth: roundToTwo(totalCo2eThisMonth),
      totalCo2ePreviousMonth: roundToTwo(totalCo2ePreviousMonth),
      emissionsVsTarget: roundToTwo(emissionsVsTarget),
      activeDepartments: departments.length,
      complianceScore,
      trend,
      trendPercent: Math.round(trendPercent * 10) / 10,
      totalEmissions,
      scope1Total,
      scope2Total,
      scope3Total,
      currentPeriod: currentWindow.period,
    };
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    return null;
  }
}

// Get emissions by category for current period
export async function getEmissionsByCategory(companyId: string, departmentId?: string | null) {
  try {
    const entries = await db.carbonLedgerEntry.findMany({
      where: buildEntryWhere({ companyId, departmentId }),
      select: {
        category: true,
        co2Equivalent: true,
        verified: true,
        transactionDate: true,
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    });

    const currentWindow = getCurrentMonthlyWindow();
    const currentEntries = getEntriesInWindow(entries, currentWindow);

    return buildEmissionsByCategorySnapshot(currentEntries, currentWindow);
  } catch (error) {
    console.error('Error getting emissions by category:', error);
    return buildEmissionsByCategorySnapshot([], getCurrentMonthlyWindow());
  }
}

export async function getDepartmentEmissions(companyId: string, departmentId?: string | null) {
  try {
    const [departments, entries] = await Promise.all([
      db.department.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          code: true,
          country: true,
        },
        orderBy: { name: 'asc' },
      }),
      db.carbonLedgerEntry.findMany({
        where: { companyId },
        select: {
          departmentId: true,
          category: true,
          co2Equivalent: true,
          verified: true,
          transactionDate: true,
        },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const currentWindow = getCurrentMonthlyWindow();
    const currentEntries = getEntriesInWindow(entries, currentWindow);

    return buildDepartmentComparisonSnapshot(
      departments,
      currentEntries,
      currentWindow,
      departmentId
    );
  } catch (error) {
    console.error('Error getting department emissions:', error);
    return [];
  }
}
