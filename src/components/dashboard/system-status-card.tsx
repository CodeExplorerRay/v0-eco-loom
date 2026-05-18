'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Clock3, Database, RefreshCw, Settings2, Upload, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  DashboardSystemStatus,
  DashboardSystemStatusItem,
  DashboardSystemStatusKey,
  DashboardSystemStatusTone,
} from '@/lib/types';

interface SystemStatusCardProps {
  companyId: string;
}

const itemIcons: Record<DashboardSystemStatusKey, typeof Upload> = {
  document_intake: Upload,
  calculation_library: Database,
  notion_workspace: Settings2,
  automation_queue: Bot,
};

const toneStyles: Record<
  DashboardSystemStatusTone,
  {
    panel: string;
    iconWrap: string;
    icon: string;
    badge: string;
  }
> = {
  healthy: {
    panel: 'border-emerald-200 bg-emerald-50/70',
    iconWrap: 'bg-white',
    icon: 'text-emerald-700',
    badge: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  },
  attention: {
    panel: 'border-amber-200 bg-amber-50/80',
    iconWrap: 'bg-white',
    icon: 'text-amber-700',
    badge: 'border-amber-200 bg-amber-100 text-amber-800',
  },
  disabled: {
    panel: 'border-slate-200 bg-slate-50/90',
    iconWrap: 'bg-white',
    icon: 'text-slate-600',
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  info: {
    panel: 'border-sky-200 bg-sky-50/80',
    iconWrap: 'bg-white',
    icon: 'text-sky-700',
    badge: 'border-sky-200 bg-sky-100 text-sky-800',
  },
};

function formatTimeAgo(value?: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value);
  const diffMs = Date.now() - timestamp.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return timestamp.toLocaleDateString();
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm"
        >
          <div className="flex animate-pulse items-start justify-between gap-3">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-white" />
              <div className="h-4 w-28 rounded bg-emerald-100" />
            </div>
            <div className="h-6 w-20 rounded-full bg-white" />
          </div>
          <div className="mt-5 space-y-2 animate-pulse">
            <div className="h-3 w-full rounded bg-emerald-100" />
            <div className="h-3 w-5/6 rounded bg-emerald-100" />
            <div className="h-3 w-2/3 rounded bg-emerald-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusItem({ item }: { item: DashboardSystemStatusItem }) {
  const Icon = itemIcons[item.key];
  const styles = toneStyles[item.tone];
  const updatedLabel = formatTimeAgo(item.updatedAt);

  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', styles.panel)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm',
              styles.iconWrap
            )}
          >
            <Icon className={cn('h-5 w-5', styles.icon)} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">{item.label}</p>
            <p className="mt-1 text-xs text-slate-500">{item.description}</p>
          </div>
        </div>
        <Badge variant="outline" className={styles.badge}>
          {item.statusLabel}
        </Badge>
      </div>

      <div className="mt-4 space-y-2 text-xs text-slate-600">
        {item.meta ? <p>{item.meta}</p> : null}
        {updatedLabel ? (
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            Updated {updatedLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SystemStatusCard({ companyId }: SystemStatusCardProps) {
  const [data, setData] = useState<DashboardSystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ companyId });
      const response = await fetch(`/api/dashboard/system-status?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load workspace status');
      }

      const payload = (await response.json()) as DashboardSystemStatus;
      setData(payload);
    } catch (loadError) {
      console.error('Error loading workspace status:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load workspace status');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const checkedLabel = formatTimeAgo(data?.checkedAt);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-emerald-600" />
            System Status
          </CardTitle>
          <CardDescription>
            {data?.summary ||
              'Current readiness of document intake, calculations, Notion sync, and automation.'}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          {checkedLabel ? `Checked ${checkedLabel}` : isLoading ? 'Checking now' : 'Status unavailable'}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900">
            <p className="font-medium">Workspace status is unavailable right now.</p>
            <p className="mt-1 text-red-900/80">{error}</p>
          </div>
        ) : data ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.items.map((item) => (
              <StatusItem key={item.key} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
            No workspace status was returned.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
