'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardHeroCard } from '@/components/dashboard/dashboard-hero-card';
import { PaginationFooter } from '@/components/dashboard/pagination-footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowUpRight,
  Clock3,
  Filter,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { AuditCenterFilters, AuditCenterRequest, AuditLogEntry, PaginatedResponse } from '@/lib/types';
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_FEATURE_OPTIONS,
  DEFAULT_AUDIT_FILTERS,
  formatAuditAction,
  getAuditActor,
  getAuditEntityLabel,
  getAuditFeature,
  getAuditFeatureBadgeClass,
  getAuditFeatureLabel,
  getAuditSummary,
  getAuditTargetName,
  parseAuditDetails,
  sanitizeAuditDetailsForDisplay,
  summarizeAuditFilters,
} from '@/lib/audit';

const PAGE_SIZE = 20;

interface AuditCenterTabProps {
  request?: AuditCenterRequest | null;
}

export function AuditCenterTab({ request }: AuditCenterTabProps) {
  const [draftFilters, setDraftFilters] = useState<AuditCenterFilters>(DEFAULT_AUDIT_FILTERS);
  const [filters, setFilters] = useState<AuditCenterFilters>(DEFAULT_AUDIT_FILTERS);
  const [logs, setLogs] = useState<PaginatedResponse<AuditLogEntry> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [focusTitle, setFocusTitle] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });

      if (filters.search.trim()) {
        params.set('search', filters.search.trim());
      }
      if (filters.feature !== 'all') {
        params.set('feature', filters.feature);
      }
      if (filters.action !== 'all') {
        params.set('action', filters.action);
      }
      if (filters.actor.trim()) {
        params.set('actor', filters.actor.trim());
      }
      if (filters.dateFrom) {
        params.set('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.set('dateTo', filters.dateTo);
      }
      if (filters.entityType) {
        params.set('entityType', filters.entityType);
      }
      if (filters.entityId) {
        params.set('entityId', filters.entityId);
      }

      const response = await fetch(`/api/audit-logs?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Failed to fetch audit logs');
      }

      const payload = (await response.json()) as PaginatedResponse<AuditLogEntry>;
      setLogs(payload);
      setLoadError(null);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLogs({
        data: [],
        total: 0,
        page: 1,
        pageSize: PAGE_SIZE,
        totalPages: 1,
      });
      setLoadError(error instanceof Error ? error.message : 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    if (!request?.key) {
      return;
    }

    const nextFilters = {
      ...DEFAULT_AUDIT_FILTERS,
      ...request.filters,
    };

    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setFocusTitle(request.title || null);
    setPage(1);
    setSelectedLog(null);
    setIsSheetOpen(false);
  }, [request]);

  const applyFilters = () => {
    setPage(1);
    setFilters({ ...draftFilters });
    setSelectedLog(null);
    setIsSheetOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_AUDIT_FILTERS);
    setFilters(DEFAULT_AUDIT_FILTERS);
    setFocusTitle(null);
    setPage(1);
    setSelectedLog(null);
    setIsSheetOpen(false);
  };

  const clearFocusedEntity = () => {
    const nextFilters = {
      ...draftFilters,
      entityType: '',
      entityId: '',
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setFocusTitle(null);
    setPage(1);
    setSelectedLog(null);
    setIsSheetOpen(false);
  };

  const activePage = logs?.page ?? page;
  const visibleRangeStart = logs?.total ? (activePage - 1) * PAGE_SIZE + 1 : 0;
  const visibleRangeEnd = logs?.total ? Math.min(activePage * PAGE_SIZE, logs.total) : 0;
  const focusSummary = useMemo(() => summarizeAuditFilters(filters), [filters]);
  const selectedDetails = useMemo(() => parseAuditDetails(selectedLog?.details), [selectedLog?.details]);
  const displayDetails = useMemo(
    () => sanitizeAuditDetailsForDisplay(selectedDetails),
    [selectedDetails]
  );

  return (
    <div className="space-y-6">
      <DashboardHeroCard
        title="Audit Center"
        description="Review recent changes across data ingest, carbon ledger, goals, reports, Notion MCP, and workspace users from one place."
        icon={<ShieldCheck className="h-8 w-8" />}
        gradientClassName="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500"
        eyebrow="Admin Review Surface"
        eyebrowIcon={<ShieldCheck className="h-3.5 w-3.5" />}
        aside={
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80">
            <p className="font-medium text-white">{logs?.total ?? 0} matching audit events</p>
            <p>Trace facilities, automation, ingest, and reporting changes from one admin surface.</p>
          </div>
        }
        asideClassName="shrink-0"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-emerald-600" />
            Audit Filters
          </CardTitle>
          <CardDescription>
            Narrow recent activity by feature, action, actor, timeframe, or a specific record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draftFilters.search}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Search actor, summary text, entity ID, or event details..."
                className="pl-10"
              />
            </div>
            <Input
              value={draftFilters.actor}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, actor: event.target.value }))
              }
              placeholder="Filter by actor name or email"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Select
              value={draftFilters.feature}
              onValueChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  feature: value as AuditCenterFilters['feature'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Feature" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_FEATURE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={draftFilters.action}
              onValueChange={(value) =>
                setDraftFilters((current) => ({ ...current, action: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={draftFilters.dateFrom}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))
              }
            />

            <Input
              type="date"
              value={draftFilters.dateTo}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, dateTo: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <Input
              value={draftFilters.entityType}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, entityType: event.target.value }))
              }
              placeholder="Entity type, for example carbon_ledger_entry"
            />
            <Input
              value={draftFilters.entityId}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, entityId: event.target.value }))
              }
              placeholder="Specific entity ID"
            />
            <div className="flex gap-2">
              <Button onClick={applyFilters}>Apply Filters</Button>
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Recent Audit Activity</CardTitle>
              <CardDescription>
                {visibleRangeStart}-{visibleRangeEnd} of {logs?.total ?? 0} matching events
              </CardDescription>
            </div>
            {(focusSummary || focusTitle) && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                  {focusTitle || focusSummary}
                </Badge>
                {(filters.entityType || filters.entityId) && (
                  <Button variant="ghost" size="sm" className="gap-1" onClick={clearFocusedEntity}>
                    <X className="h-4 w-4" />
                    Clear focus
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="font-medium">Audit activity could not be loaded.</p>
              <p className="mt-1 text-red-900/80">{loadError}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Loading recent audit events...
            </div>
          ) : logs?.data.length ? (
            <>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[170px]">Timestamp</TableHead>
                      <TableHead className="w-[160px]">Feature</TableHead>
                      <TableHead className="w-[140px]">Action</TableHead>
                      <TableHead className="w-[220px]">Actor</TableHead>
                      <TableHead className="w-[220px]">Entity</TableHead>
                      <TableHead>Summary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.data.map((log) => {
                      const feature = getAuditFeature(log.entityType);
                      return (
                        <TableRow
                          key={log.id}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedLog(log);
                            setIsSheetOpen(true);
                          }}
                        >
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{formatDateTime(log.createdAt)}</p>
                              <p className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className={getAuditFeatureBadgeClass(feature)}>
                              {getAuditFeatureLabel(feature)}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline">{formatAuditAction(log.action)}</Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{getAuditActor(log)}</p>
                              {log.user?.email && (
                                <p className="text-xs text-muted-foreground">{log.user.email}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{getAuditEntityLabel(log.entityType)}</p>
                              <p className="text-xs text-muted-foreground">{getAuditTargetName(log)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-sm text-muted-foreground">
                            {getAuditSummary(log)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <PaginationFooter
                summary={`${visibleRangeStart}-${visibleRangeEnd} of ${logs.total} audit events • ${PAGE_SIZE} per page`}
                page={activePage}
                totalPages={logs.totalPages}
                isLoading={isLoading}
                previousDisabled={activePage <= 1}
                nextDisabled={activePage >= logs.totalPages}
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                onNext={() => setPage((current) => Math.min(logs.totalPages, current + 1))}
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="text-sm font-medium">No audit activity matched these filters.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try widening the date range or clearing one of the targeted filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          {selectedLog && (
            <>
              <SheetHeader className="border-b">
                <div className="flex items-start justify-between gap-4 pr-8">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={getAuditFeatureBadgeClass(getAuditFeature(selectedLog.entityType))}
                      >
                        {getAuditFeatureLabel(getAuditFeature(selectedLog.entityType))}
                      </Badge>
                      <Badge variant="outline">{formatAuditAction(selectedLog.action)}</Badge>
                    </div>
                    <div>
                      <SheetTitle>
                        {formatAuditAction(selectedLog.action)} {getAuditEntityLabel(selectedLog.entityType)}
                      </SheetTitle>
                      <SheetDescription>{getAuditSummary(selectedLog)}</SheetDescription>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 px-4">
                <div className="space-y-6 py-4">
                  <div className="grid gap-4 rounded-xl border bg-muted/20 p-4">
                    <DetailRow label="Actor" value={getAuditActor(selectedLog)} />
                    <DetailRow label="Timestamp" value={formatDateTime(selectedLog.createdAt)} />
                    <DetailRow label="Relative Time" value={formatRelativeTime(selectedLog.createdAt)} />
                    <DetailRow label="Feature" value={getAuditFeatureLabel(getAuditFeature(selectedLog.entityType))} />
                    <DetailRow label="Entity Type" value={getAuditEntityLabel(selectedLog.entityType)} />
                    <DetailRow label="Entity ID" value={selectedLog.entityId} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-sm font-semibold">Event Details</h3>
                    </div>

                    {displayDetails ? (
                      <div className="space-y-3 rounded-xl border p-4">
                        {Object.entries(displayDetails).map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {formatDetailKey(key)}
                            </p>
                            <div className="rounded-lg bg-muted/30 p-3 text-sm">
                              {renderDetailValue(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        No structured audit details were recorded for this event.
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="max-w-[60%] text-right text-sm font-medium">{value}</p>
    </div>
  );
}

function formatDateTime(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}

function formatRelativeTime(timestamp: string) {
  const now = Date.now();
  const value = new Date(timestamp).getTime();
  const seconds = Math.max(0, Math.floor((now - value) / 1000));

  if (seconds < 60) {
    return 'Just now';
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
  if (seconds < 604800) {
    return `${Math.floor(seconds / 86400)}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

function formatDetailKey(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderDetailValue(value: unknown) {
  if (value === null || value === undefined) {
    return 'None';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
