// Metric Cards Component

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Leaf, 
  Target, 
  Building2, 
  CheckCircle2 
} from 'lucide-react';
import type { DashboardMetrics } from '@/lib/types';
import { formatCo2e } from '@/lib/utils';

interface MetricCardsProps {
  data: DashboardMetrics | null;
  isLoading?: boolean;
}

type MetricTone = 'higher-better' | 'lower-better';

function safeMetricNumber(value: number | null | undefined, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function TrendIndicator({ trend, percent }: { trend: string; percent: number }) {
  if (trend === 'up') {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{percent.toFixed(1)}%
      </Badge>
    );
  }
  if (trend === 'down') {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
        <TrendingDown className="h-3 w-3 mr-1" />
        -{percent.toFixed(1)}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground">
      <Minus className="h-3 w-3 mr-1" />
      Stable
    </Badge>
  );
}

function getProgressClass(progress: number, tone: MetricTone) {
  if (tone === 'lower-better') {
    if (progress > 100) return 'bg-red-500';
    if (progress > 80) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  if (progress >= 80) return 'bg-green-500';
  if (progress >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function MetricCards({ data, isLoading }: MetricCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-5 w-5 bg-muted rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-muted rounded mb-2" />
              <div className="h-3 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {['Total CO2e', 'Carbon Budget Used', 'Active Facilities', 'Goal Health Score'][i]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">No data available</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalCo2eThisMonth = safeMetricNumber(data.totalCo2eThisMonth);
  const emissionsVsTarget = safeMetricNumber(data.emissionsVsTarget);
  const activeDepartments = Math.max(0, Math.trunc(safeMetricNumber(data.activeDepartments)));
  const complianceScore = safeMetricNumber(data.complianceScore);
  const trendPercent = safeMetricNumber(data.trendPercent);

  const metrics = [
    {
      title: 'Total CO2e This Month',
      value: formatCo2e(totalCo2eThisMonth),
      description: 'vs last month',
      icon: Leaf,
      trend: <TrendIndicator trend={data.trend} percent={trendPercent} />,
    },
    {
      title: 'Carbon Budget Used',
      value: `${emissionsVsTarget.toFixed(1)}%`,
      description: 'of monthly emissions budget used',
      icon: Target,
      progress: emissionsVsTarget,
      progressTone: 'lower-better' as const,
      progressNote:
        emissionsVsTarget > 100
          ? `${(emissionsVsTarget - 100).toFixed(1)}% over monthly budget`
          : undefined,
    },
    {
      title: 'Active Facilities',
      value: activeDepartments.toString(),
      description: 'tracked facilities',
      icon: Building2,
    },
    {
      title: 'Goal Health Score',
      value: `${complianceScore.toFixed(0)}%`,
      description: 'share of goals on track or achieved',
      icon: CheckCircle2,
      progress: complianceScore,
      progressTone: 'higher-better' as const,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <metric.icon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.trend}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
            {metric.progress !== undefined && (
              <>
                <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressClass(
                      metric.progress,
                      metric.progressTone ?? 'higher-better'
                    )}`}
                    style={{ width: `${Math.min(metric.progress, 100)}%` }}
                  />
                </div>
                {metric.progressNote && (
                  <p className="mt-2 text-xs font-medium text-red-600">{metric.progressNote}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
