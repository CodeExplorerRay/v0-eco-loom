// Monthly Trend Chart

'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlyEmissions } from '@/lib/types';
import { formatCo2e, formatCompactCo2e } from '@/lib/utils';

interface MonthlyTrendChartProps {
  data: MonthlyEmissions[] | null;
  isLoading?: boolean;
}

export function MonthlyTrendChart({ data, isLoading }: MonthlyTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Emissions Trend</CardTitle>
          <CardDescription>Last 12 months of emissions data</CardDescription>
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
          <CardTitle>Monthly Emissions Trend</CardTitle>
          <CardDescription>Last 12 months of emissions data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map((item) => ({
    ...item,
    displayMonth:
      item.label ||
      new Date(`${item.month}-01T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Emissions Trend</CardTitle>
        <CardDescription>Last 12 months of emissions data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={formattedData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorEmissions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayMonth" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => formatCompactCo2e(value)}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCo2e(value),
                  name === 'target' ? 'Target' : 'Emissions',
                ]}
                labelFormatter={(label, payload) => {
                  const point = payload?.[0]?.payload as MonthlyEmissions | undefined;
                  const parts = [`Month: ${label}`];
                  if (typeof point?.entryCount === 'number') {
                    parts.push(`${point.entryCount} ${point.entryCount === 1 ? 'entry' : 'entries'}`);
                  }
                  if (typeof point?.verificationRate === 'number' && point.entryCount && point.entryCount > 0) {
                    parts.push(`${point.verificationRate.toFixed(0)}% verified`);
                  }
                  return parts.join(' • ');
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="emissions"
                name="Actual Emissions"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorEmissions)"
              />
              {formattedData[0]?.target !== undefined && (
                <Area
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorTarget)"
                  strokeDasharray="5 5"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
