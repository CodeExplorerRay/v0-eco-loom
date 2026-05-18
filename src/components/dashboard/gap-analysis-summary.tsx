// Gap Analysis Summary Component

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  DashboardDialogBody,
  DashboardDialogContentShell,
  DashboardDialogIntro,
} from '@/components/dashboard/dashboard-dialog';
import { AlertTriangle, CheckCircle2, Clock, Target } from 'lucide-react';
import { formatGapValue } from '@/lib/gap-analysis';
import type { GapAnalysis, StoredGapItem } from '@/lib/types';

interface GapAnalysisSummaryProps {
  data: GapAnalysis | null;
  isLoading?: boolean;
}

export function GapAnalysisSummary({ data, isLoading }: GapAnalysisSummaryProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gap Analysis Summary</CardTitle>
          <CardDescription>Current sustainability goal status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted animate-pulse">
                <div className="h-4 w-20 bg-muted-foreground/20 rounded mb-2" />
                <div className="h-8 w-12 bg-muted-foreground/20 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gap Analysis Summary</CardTitle>
          <CardDescription>Current sustainability goal status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            No goals data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: 'Needs Attention',
      value: data.goalsAtRisk,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    {
      label: 'In Progress',
      value: data.goalsOnTrack,
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
    },
    {
      label: 'Completed',
      value: data.goalsAchieved,
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
    },
  ];

  const totalGoals = data.totalGoals ?? data.goalsAtRisk + data.goalsOnTrack + data.goalsAchieved;
  const topGaps = data.topGaps ?? [];
  const largestGap = data.largestGap ?? topGaps[0] ?? null;
  const summaryStats = [
    {
      label: 'Needs Attention',
      value: data.goalsAtRisk,
      tone: 'text-red-600',
    },
    {
      label: 'In Progress',
      value: data.goalsOnTrack,
      tone: 'text-amber-600',
    },
    {
      label: 'Completed',
      value: data.goalsAchieved,
      tone: 'text-emerald-600',
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Gap Analysis Summary</CardTitle>
            <CardDescription>
              {totalGoals > 0
                ? `${totalGoals} goals are being tracked in this facility view.`
                : 'Current sustainability goal status'}
            </CardDescription>
          </div>
          {totalGoals > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setDetailsOpen(true)}
            >
              View details
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {summaryStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className={`mt-1 text-2xl font-semibold ${stat.tone}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {largestGap && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-100 p-2">
                  <Target className="h-4 w-4 text-emerald-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-emerald-950">Main thing to focus on next</p>
                  <p className="text-sm text-emerald-900">{buildLargestGapSummary(largestGap)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(data.gapTotalsByUnit || []).slice(0, 2).map((item) => (
              <Badge key={`${item.unit}-${item.total}`} variant="outline" className="bg-white">
                {item.label}
              </Badge>
            ))}
            {typeof data.verificationRate === 'number' && (
              <Badge variant="outline" className="bg-white">
                {data.verificationRate.toFixed(0)}% of rows verified
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DashboardDialogContentShell size="wide">
          <DashboardDialogIntro
            badge="Goal review"
            title="Gap Analysis Details"
            description={
              totalGoals > 0
                ? `${totalGoals} goals are being tracked in this facility view. This detailed view shows open gaps, current progress, and reliability context.`
                : 'Current sustainability goal status'
            }
          />

          <DashboardDialogBody className="space-y-5 md:space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`flex items-center gap-3 rounded-lg border p-4 ${stat.bg} ${stat.border}`}
                >
                  <div className={`rounded-full p-2 ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {largestGap && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-emerald-100 p-2">
                    <Target className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-emerald-950">Main thing to focus on next</p>
                    <p className="text-sm text-emerald-900">{buildLargestGapSummary(largestGap)}</p>
                  </div>
                </div>
              </div>
            )}

            {data.gapTotalsByUnit && data.gapTotalsByUnit.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium">What Is Still Off Target</p>
                    <p className="text-sm text-muted-foreground">
                      Different units stay separate here, so carbon, water, energy, and percentage goals are not mixed together.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.gapTotalsByUnit.map((item) => (
                      <Badge key={`${item.unit}-${item.total}`} variant="outline" className="bg-white">
                        {item.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {topGaps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-medium">Where To Focus Next</p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {topGaps.map((gap, index) => (
                    <div
                      key={`${gap.kind}-${index}`}
                      className="rounded-xl border bg-background p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{getGapTitle(gap)}</p>
                          <p className="text-xs text-muted-foreground">{getGapMeta(gap)}</p>
                        </div>
                        <Badge variant="outline" className={getGapBadgeClassName(gap)}>
                          {getGapBadgeLabel(gap)}
                        </Badge>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">{gap.summary}</p>
                      {gap.kind === 'goal' && (
                        <>
                          <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
                            <span className="text-muted-foreground">Still to close</span>
                            <span className="font-semibold text-slate-900">
                              {formatGapValue(gap.gapValue, gap.gapUnit)}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Current progress</span>
                            <span className="font-medium text-slate-700">{gap.progress.toFixed(1)}%</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {typeof data.verificationRate === 'number' && (
              <div className="rounded-lg border bg-emerald-50/70 p-5">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-medium text-emerald-900">How Reliable This View Is</p>
                  <p className="text-sm text-emerald-800">
                    {data.verificationRate.toFixed(1)}% of ledger rows in this scope are verified
                  </p>
                </div>
                </div>
              )}
          </DashboardDialogBody>
        </DashboardDialogContentShell>
      </Dialog>
    </>
  );
}

function getGapTitle(gap: StoredGapItem) {
  switch (gap.kind) {
    case 'goal':
      return gap.goal;
    case 'issue':
      return gap.issue;
    case 'area':
      return gap.area;
    default:
      return 'Open gap';
  }
}

function getGapMeta(gap: StoredGapItem) {
  switch (gap.kind) {
    case 'goal':
      return `${gap.department} • ${gap.status === 'at_risk' ? 'Needs attention now' : 'Improving, but still open'}`;
    case 'issue':
      return gap.facility;
    case 'area':
      return gap.gapValue
        ? formatGapValue(gap.gapValue, gap.gapUnit || 'units')
        : 'Gap analysis note';
    default:
      return '';
  }
}

function getGapBadgeLabel(gap: StoredGapItem) {
  if (gap.kind === 'goal') {
    return gap.status === 'at_risk' ? 'Needs Attention' : 'Improving';
  }

  return gap.severity.charAt(0).toUpperCase() + gap.severity.slice(1);
}

function buildLargestGapSummary(gap: StoredGapItem) {
  switch (gap.kind) {
    case 'goal': {
      const relationLabel = gap.relation === 'above_target' ? 'above' : 'below';
      return `${gap.department} is still ${formatGapValue(gap.gapValue, gap.gapUnit)} ${relationLabel} target on ${gap.goal}.`;
    }
    case 'issue':
      return `${gap.facility} has an open issue: ${gap.issue}.`;
    case 'area': {
      const gapValue = typeof gap.gapValue === 'number' ? gap.gapValue : 0;
      const gapUnit = gap.gapUnit || 'units';
      return gapValue > 0
        ? `${gap.area} still has ${formatGapValue(gapValue, gapUnit)} left to close.`
        : `${gap.area} still needs a follow-up review.`;
    }
    default:
      return 'There is an open gap that still needs follow-up.';
  }
}

function getGapBadgeClassName(gap: StoredGapItem) {
  if (gap.kind === 'goal') {
    return gap.status === 'at_risk'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (gap.severity === 'high') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (gap.severity === 'medium') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}
