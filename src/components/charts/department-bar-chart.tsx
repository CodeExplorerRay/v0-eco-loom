// Facility Emissions Bar Chart

'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  DashboardDialogBody,
  DashboardDialogContentShell,
  DashboardDialogIntro,
} from '@/components/dashboard/dashboard-dialog';
import type { DepartmentEmissions } from '@/lib/types';
import { cn, formatCo2e, formatCompactCo2e } from '@/lib/utils';

interface DepartmentBarChartProps {
  data: DepartmentEmissions[] | null;
  isLoading?: boolean;
}

type FacilityChartRow = DepartmentEmissions & {
  shortLabel: string;
  fillColor: string;
};

const COLORS = ['#22c55e', '#10b981', '#14b8a6', '#84cc16', '#f59e0b', '#38bdf8'];
const SELECTED_COLOR = '#065f46';
const MAX_VISIBLE_FACILITIES = 5;

function getVisibleFacilities(data: DepartmentEmissions[]) {
  const ranked = [...data].sort((a, b) => b.emissions - a.emissions || a.name.localeCompare(b.name));
  const topFacilities = ranked.slice(0, Math.min(ranked.length, MAX_VISIBLE_FACILITIES));
  const selectedFacility = ranked.find((item) => item.isSelected);

  if (selectedFacility && !topFacilities.some((item) => item.id === selectedFacility.id)) {
    return [...topFacilities.slice(0, MAX_VISIBLE_FACILITIES - 1), selectedFacility].sort(
      (a, b) => b.emissions - a.emissions || a.name.localeCompare(b.name)
    );
  }

  return topFacilities;
}

function getShortLabel(item: DepartmentEmissions) {
  if (item.code?.trim()) {
    return item.code.trim();
  }

  return item.name.length > 16 ? `${item.name.slice(0, 14)}...` : item.name;
}

function ComparisonTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: FacilityChartRow }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;
  if (!item) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
      <div className="space-y-1">
        <p className="font-medium text-slate-900">
          {item.name}
          {item.code ? ` (${item.code})` : ''}
        </p>
        <p className="text-xs text-muted-foreground">{item.country || 'Country not set'}</p>
      </div>
      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Emissions</span>
          <span className="font-medium text-slate-900">{formatCo2e(item.emissions)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Share of snapshot</span>
          <span className="font-medium text-slate-900">{item.percent.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Verified emissions</span>
          <span className="font-medium text-slate-900">{formatCo2e(item.verifiedEmissions)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Ledger entries</span>
          <span className="font-medium text-slate-900">{item.entryCount}</span>
        </div>
      </div>
    </div>
  );
}

export function DepartmentBarChart({ data, isLoading }: DepartmentBarChartProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facility Comparison</CardTitle>
          <CardDescription>Top 5 facilities by emissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded-lg h-full w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facility Comparison</CardTitle>
          <CardDescription>Latest shared snapshot across tracked facilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleFacilities = getVisibleFacilities(data);
  const chartData: FacilityChartRow[] = visibleFacilities.map((item, index) => ({
    ...item,
    shortLabel: getShortLabel(item),
    fillColor: item.isSelected ? SELECTED_COLOR : COLORS[index % COLORS.length],
  }));
  const totalEmissions = data.reduce((sum, item) => sum + item.emissions, 0);
  const selectedFacility = data.find((item) => item.isSelected) || null;
  const periodLabel =
    data.find((item) => item.periodLabel && item.periodLabel.length > 0)?.periodLabel ||
    'Latest month';
  const description =
    data.length <= 1
      ? `${periodLabel} snapshot for the only tracked facility`
      : selectedFacility
        ? `${periodLabel} comparison across all facilities. ${selectedFacility.name} is highlighted.`
        : `${periodLabel} comparison across tracked facilities and sites.`;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Facility Comparison</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {totalEmissions > 0 && (
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
        <CardContent>
          {totalEmissions <= 0 ? (
            <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 text-center">
              <p className="text-sm font-medium text-foreground">No facility emissions recorded yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Once ledger activity is recorded for this snapshot window, facility comparison will rank sites side by side here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-sm font-medium text-emerald-900">Shared comparison snapshot</p>
                <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
                  <div>
                    <p className="text-2xl font-semibold text-emerald-950">
                      {formatCo2e(totalEmissions)}
                    </p>
                    <p className="text-xs text-emerald-800">total facility emissions in this month</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-950">{data.length}</p>
                    <p className="text-xs text-emerald-800">facilities compared</p>
                  </div>
                  {selectedFacility && (
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">
                        {selectedFacility.percent.toFixed(1)}%
                      </p>
                      <p className="text-xs text-emerald-800">
                        {selectedFacility.name} share
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 8, right: 18, left: 18, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                      horizontal
                      vertical={false}
                    />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => formatCompactCo2e(value)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="shortLabel"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      width={76}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<ComparisonTooltip />}
                      cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                    />
                    <Bar dataKey="emissions" radius={[0, 6, 6, 0]}>
                      {chartData.map((item) => (
                        <Cell key={item.id} fill={item.fillColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DashboardDialogContentShell size="wide">
          <DashboardDialogIntro
            badge="Facility benchmark"
            title="Facility Comparison Details"
            description={description}
          />

          <DashboardDialogBody className="space-y-5 md:space-y-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
              <p className="text-sm font-medium text-emerald-900">Shared comparison snapshot</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
                <div>
                  <p className="text-2xl font-semibold text-emerald-950">
                    {formatCo2e(totalEmissions)}
                  </p>
                  <p className="text-xs text-emerald-800">total facility emissions in this month</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-950">{data.length}</p>
                  <p className="text-xs text-emerald-800">facilities compared</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {data.map((facility, index) => (
                <div
                  key={facility.id}
                  className={cn(
                    'rounded-xl border bg-white p-5 shadow-sm',
                    facility.isSelected
                      ? 'border-emerald-300 bg-emerald-50/40'
                      : 'border-slate-200'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              facility.isSelected
                                ? SELECTED_COLOR
                                : COLORS[index % COLORS.length],
                          }}
                          aria-hidden="true"
                        />
                        <p className="font-medium text-slate-900">{facility.name}</p>
                        {facility.isSelected && (
                          <Badge
                            variant="outline"
                            className="border-emerald-300 bg-emerald-100 text-emerald-800"
                          >
                            Selected view
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {facility.country || 'Country not set'}
                        {facility.code ? ` • ${facility.code}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCo2e(facility.emissions)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {facility.percent.toFixed(1)}% of snapshot
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Ledger rows
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {facility.entryCount} {facility.entryCount === 1 ? 'entry' : 'entries'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Verified rows
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {facility.verifiedEntries}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Verified emissions
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatCo2e(facility.verifiedEmissions)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Emissions verified
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {facility.verificationRate.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DashboardDialogBody>
        </DashboardDialogContentShell>
      </Dialog>
    </>
  );
}
