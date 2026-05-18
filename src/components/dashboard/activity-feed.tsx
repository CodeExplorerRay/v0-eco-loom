// Activity Feed Component

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Upload,
  Database,
  FileText,
  CheckCircle, 
  Target, 
  FileBarChart, 
  Clock,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { ActivityFeedItem, AuditCenterRequest } from '@/lib/types';
import {
  formatAuditAction,
  getAuditFeatureBadgeClass,
  getAuditFeatureLabel,
} from '@/lib/audit';

interface ActivityFeedProps {
  data: ActivityFeedItem[] | null;
  isLoading?: boolean;
  isAdminView?: boolean;
  onOpenAuditCenter?: (filters: AuditCenterRequest['filters'], title?: string) => void;
}

const activityIcons = {
  ledger: Database,
  goals: Target,
  reports: FileBarChart,
  notion: Settings,
  users: Users,
  ingest: Upload,
  system: ShieldCheck,
};

const statusColors = {
  success: 'bg-green-500/10 text-green-500 border-green-500/20',
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  warning: 'bg-red-500/10 text-red-500 border-red-500/20',
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function ActivityFeed({ data, isLoading, isAdminView = false, onOpenAuditCenter }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            {isAdminView ? 'Latest audit events across the workspace' : 'Recent operational activity'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-4 h-[300px]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/4 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            {isAdminView ? 'Latest audit events across the workspace' : 'Recent operational activity'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No recent activity
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          {isAdminView ? 'Latest audit events across the workspace' : 'Recent operational activity'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[300px] pr-3">
          <div className="space-y-3">
            {data.map((item) => {
              const Icon = item.action === 'verify' ? CheckCircle : activityIcons[item.feature] || FileText;
              const isClickable = Boolean(isAdminView && onOpenAuditCenter);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-2.5 transition-colors',
                    isClickable ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/30'
                  )}
                  onClick={() => {
                    if (!isClickable || !onOpenAuditCenter) {
                      return;
                    }

                    if (item.feature === 'notion') {
                      onOpenAuditCenter({ feature: 'notion' }, 'Notion audit activity');
                      return;
                    }

                    if (item.feature === 'goals' && item.entityId) {
                      onOpenAuditCenter(
                        { feature: 'goals', entityId: item.entityId },
                        item.message
                      );
                      return;
                    }

                    if (item.entityType && item.entityId) {
                      onOpenAuditCenter(
                        {
                          feature: item.feature,
                          entityType: item.entityType,
                          entityId: item.entityId,
                        },
                        item.message
                      );
                      return;
                    }

                    onOpenAuditCenter({ feature: item.feature }, item.message);
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{item.message}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('text-[11px]', getAuditFeatureBadgeClass(item.feature))}
                      >
                        {getAuditFeatureLabel(item.feature)}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        {formatAuditAction(item.action)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(item.timestamp)}
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={statusColors[item.status]}
                  >
                    {item.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
