// Emissions by Category Pie Chart

'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  DashboardDialogBody,
  DashboardDialogContentShell,
  DashboardDialogIntro,
} from '@/components/dashboard/dashboard-dialog';
import type { EmissionsByCategory } from '@/lib/types';
import { formatCo2e } from '@/lib/utils';

interface EmissionsPieChartProps {
  data: EmissionsByCategory | null;
  isLoading?: boolean;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b'];

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function EmissionsPieChart({ data, isLoading }: EmissionsPieChartProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emissions by Category</CardTitle>
          <CardDescription>Scope 1, 2, and 3 breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded-full h-48 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emissions by Category</CardTitle>
          <CardDescription>Scope 1, 2, and 3 breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const rawChartData = (data.breakdown && data.breakdown.length > 0
    ? data.breakdown
    : [
        {
          key: 'scope1',
          name: 'Scope 1',
          value: data.scope1,
          share: 0,
          verifiedValue: data.scope1,
          unverifiedValue: 0,
          entryCount: 0,
          color: COLORS[0],
          description: 'Direct emissions from onsite operations.',
        },
        {
          key: 'scope2',
          name: 'Scope 2',
          value: data.scope2,
          share: 0,
          verifiedValue: data.scope2,
          unverifiedValue: 0,
          entryCount: 0,
          color: COLORS[1],
          description: 'Indirect emissions from purchased energy.',
        },
        {
          key: 'scope3',
          name: 'Scope 3',
          value: data.scope3,
          share: 0,
          verifiedValue: data.scope3,
          unverifiedValue: 0,
          entryCount: 0,
          color: COLORS[2],
          description: 'Value-chain emissions.',
        },
      ]).filter((item) => item.value > 0);

  const total = data.total ?? rawChartData.reduce((sum, item) => sum + item.value, 0);
  const chartData = rawChartData.map((item) => ({
    ...item,
    share: item.share > 0 ? item.share : total > 0 ? (item.value / total) * 100 : 0,
  }));
  const verifiedTotal = data.verifiedTotal ?? total;
  const unverifiedTotal = data.unverifiedTotal ?? Math.max(0, total - verifiedTotal);
  const verificationRate =
    data.verificationRate ?? (total > 0 ? (verifiedTotal / total) * 100 : 0);
  const description = data.periodLabel
    ? `${data.periodLabel} split across GHG Scope 1, 2, and 3 for this facility view`
    : 'Current month split across GHG Scope 1, 2, and 3 for this facility view';
  const summaryStats = [
    {
      label: 'Total',
      value: formatCo2e(total),
    },
    {
      label: 'Verified',
      value: formatPercent(verificationRate),
    },
    {
      label: unverifiedTotal > 0 ? 'Pending' : 'Status',
      value: unverifiedTotal > 0 ? formatCo2e(unverifiedTotal) : 'All reviewed',
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Emissions by Category</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {total > 0 && (
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
          {total <= 0 ? (
            <div className="flex h-[260px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 text-center">
              <p className="text-sm font-medium text-foreground">No emissions recorded yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Once ledger entries are added for this facility view, the Scope 1, 2, and 3 split will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {summaryStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-base font-semibold text-emerald-950">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,240px)_1fr] lg:items-start">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={92}
                        innerRadius={58}
                        fill="#8884d8"
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatCo2e(value), 'Emissions']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5">
                  {chartData.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                              aria-hidden="true"
                            />
                            <p className="font-medium text-slate-900">{item.name}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatPercent(item.share)} of total
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold text-slate-900">
                          {formatCo2e(item.value)}
                        </p>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(item.share, 6)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DashboardDialogContentShell size="wide">
          <DashboardDialogIntro
            badge="Analytics detail"
            title="Emissions by Category Details"
            description={description}
          />

          <DashboardDialogBody className="space-y-5 md:space-y-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
              <p className="text-sm font-medium text-emerald-900">Current category snapshot</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
                <div>
                  <p className="text-2xl font-semibold text-emerald-950">{formatCo2e(total)}</p>
                  <p className="text-xs text-emerald-800">total emissions in this view</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-950">
                    {formatPercent(verificationRate)}
                  </p>
                  <p className="text-xs text-emerald-800">verified share</p>
                </div>
                {unverifiedTotal > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-emerald-950">
                      {formatCo2e(unverifiedTotal)}
                    </p>
                    <p className="text-xs text-emerald-800">still pending verification</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {chartData.map((item) => (
                <div
                  key={item.key}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        <p className="font-medium text-slate-900">{item.name}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{formatCo2e(item.value)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(item.share)} of total
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Verified
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatCo2e(item.verifiedValue)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Pending review
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {formatCo2e(item.unverifiedValue)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Ledger rows
                      </p>
                      <p className="mt-1 font-medium text-slate-800">
                        {item.entryCount} {item.entryCount === 1 ? 'entry' : 'entries'}
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
