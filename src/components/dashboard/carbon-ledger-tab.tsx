// Carbon Ledger Tab Component - Production Ready with Full API Integration

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardHeroCard } from '@/components/dashboard/dashboard-hero-card';
import { PaginationFooter } from '@/components/dashboard/pagination-footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DashboardDialogBody,
  DashboardDialogContentShell,
  DashboardDialogIntro,
} from '@/components/dashboard/dashboard-dialog';
import { 
  Database, 
  Search, 
  Filter, 
  Download, 
  ExternalLink,
  Leaf,
  Plane,
  Truck,
  Zap,
  Flame,
  Trash2,
  Droplets,
  FileText,
  MoreHorizontal,
  Eye,
  Edit,
  Trash,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatAuditAction, getAuditActor, getAuditSummary } from '@/lib/audit';
import { formatCo2e, getCo2eDisplay } from '@/lib/utils';
import type {
  AuditCenterRequest,
  AuditLogEntry,
  CarbonLedgerEntry,
  NotionStatus,
  SourceType,
  EmissionScope,
  Department,
  LedgerEntriesSummary,
  PaginatedLedgerEntriesResponse,
  SessionInfo,
} from '@/lib/types';

interface CarbonLedgerTabProps {
  companyId: string;
  selectedFacilityId?: string | null;
  onOpenAuditCenter?: (filters: AuditCenterRequest['filters'], title?: string) => void;
}

const getSourceIcon = (type: SourceType) => {
  const icons: Record<SourceType, React.ReactNode> = {
    electricity: <Zap className="h-4 w-4 text-yellow-500" />,
    travel: <Plane className="h-4 w-4 text-blue-500" />,
    shipping: <Truck className="h-4 w-4 text-purple-500" />,
    gas: <Flame className="h-4 w-4 text-orange-500" />,
    waste: <Trash2 className="h-4 w-4 text-red-500" />,
    water: <Droplets className="h-4 w-4 text-cyan-500" />,
    other: <FileText className="h-4 w-4 text-gray-500" />,
  };
  return icons[type];
};

const getScopeBadge = (scope: EmissionScope) => {
  const colors: Record<EmissionScope, string> = {
    'Scope 1': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Scope 2': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Scope 3': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return (
    <Badge variant="outline" className={colors[scope]}>
      {scope}
    </Badge>
  );
};

const LEDGER_PAGE_SIZE = 20;

const EMPTY_LEDGER_SUMMARY: LedgerEntriesSummary = {
  entryCount: 0,
  totalCo2e: 0,
  verifiedCount: 0,
  verifiedCo2e: 0,
  pendingCount: 0,
  pendingCo2e: 0,
  notionSyncedCount: 0,
  notionLinkedCount: 0,
  notionLinkReviewCount: 0,
  notionPendingCount: 0,
};

export function CarbonLedgerTab({
  companyId,
  selectedFacilityId,
  onOpenAuditCenter,
}: CarbonLedgerTabProps) {
  const [entries, setEntries] = useState<CarbonLedgerEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [notionStatus, setNotionStatus] = useState<NotionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerEntriesSummary>(EMPTY_LEDGER_SUMMARY);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<CarbonLedgerEntry | null>(null);
  const [entryHistory, setEntryHistory] = useState<AuditLogEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    activityValue: '',
    notes: '',
  });

  // Fetch entries from API
  const fetchEntries = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        companyId,
        page: String(targetPage),
        pageSize: String(LEDGER_PAGE_SIZE),
      });

      if (selectedFacilityId) {
        params.set('departmentId', selectedFacilityId);
      }

      if (search.trim()) {
        params.set('search', search.trim());
      }

      if (sourceFilter !== 'all') {
        params.set('sourceType', sourceFilter);
      }

      if (scopeFilter !== 'all') {
        params.set('scope', scopeFilter);
      }

      const response = await fetch(`/api/ledger?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to fetch ledger entries' }));
        throw new Error(payload.error || 'Failed to fetch ledger entries');
      }

      const data = (await response.json()) as PaginatedLedgerEntriesResponse;
      setEntries(data.data);
      setTotalEntries(data.total);
      setTotalPages(data.totalPages);
      setLedgerSummary(data.summary ?? EMPTY_LEDGER_SUMMARY);
      if (data.page !== targetPage) {
        setPage(data.page);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      setEntries([]);
      setTotalEntries(0);
      setTotalPages(1);
      setLedgerSummary(EMPTY_LEDGER_SUMMARY);
      setLoadError(error instanceof Error ? error.message : 'Failed to fetch ledger entries');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, scopeFilter, search, selectedFacilityId, sourceFilter]);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch(`/api/departments?companyId=${companyId}`);
      if (response.ok) {
        setDepartments(await response.json());
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, [companyId]);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      if (response.ok) {
        setSession(await response.json());
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  }, []);

  const fetchNotionStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/notion/status', { cache: 'no-store' });
      if (response.ok) {
        setNotionStatus(await response.json());
      }
    } catch (error) {
      console.error('Error fetching Notion status:', error);
    }
  }, []);

  const refreshEntries = useCallback(() => {
    void fetchEntries(page);
    void fetchNotionStatus();
  }, [fetchEntries, fetchNotionStatus, page]);

  useEffect(() => {
    void fetchEntries(page);
  }, [fetchEntries, page]);

  useEffect(() => {
    void fetchDepartments();
    void fetchSession();
    void fetchNotionStatus();
  }, [fetchDepartments, fetchNotionStatus, fetchSession]);

  const fetchEntryHistory = useCallback(async (entryId: string) => {
    setIsHistoryLoading(true);
    try {
      const response = await fetch(`/api/ledger/${entryId}/history`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const history = (await response.json()) as AuditLogEntry[];
      setEntryHistory(history);
    } catch (error) {
      console.error('Error fetching entry history:', error);
      setEntryHistory([]);
      toast.error('Failed to load ledger history');
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedEntry) {
      setEntryHistory([]);
      setIsHistoryLoading(false);
      return;
    }

    void fetchEntryHistory(selectedEntry.id);
  }, [fetchEntryHistory, selectedEntry]);

  const openSelectedEntryInAuditCenter = useCallback(() => {
    if (!selectedEntry || !onOpenAuditCenter) {
      return;
    }

    onOpenAuditCenter(
      {
        feature: 'ledger',
        entityType: 'carbon_ledger_entry',
        entityId: selectedEntry.id,
      },
      `Ledger entry ${selectedEntry.id}`
    );
    setSelectedEntry(null);
  }, [onOpenAuditCenter, selectedEntry]);

  // Edit entry
  const handleEdit = async () => {
    if (!selectedEntry) return;

    const parsedActivityValue = Number.parseFloat(editForm.activityValue);
    if (!Number.isFinite(parsedActivityValue) || parsedActivityValue < 0) {
      toast.error('Enter a valid non-negative activity value');
      return;
    }
    
    try {
      const response = await fetch(`/api/ledger/${selectedEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityValue: parsedActivityValue,
          notes: editForm.notes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(payload.error || 'Update failed');
      }

      const updated = await response.json();
      setEntries(prev => prev.map(e => e.id === selectedEntry.id ? { ...e, ...updated } : e));
      toast.success('Entry updated successfully');
      if (updated.notionSync?.status === 'failed') {
        toast.error(updated.notionSync.reason || 'The entry updated locally, but Notion auto-sync failed.');
      } else if (updated.notionSync?.status === 'skipped') {
        toast.info(updated.notionSync.reason || 'The entry updated locally, but Notion auto-sync is unavailable right now.');
      }
      await fetchEntries(page);
      await fetchNotionStatus();
      setIsEditDialogOpen(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update entry');
    }
  };

  // Delete entry
  const handleDelete = async () => {
    if (!selectedEntry) return;
    
    try {
      const response = await fetch(`/api/ledger/${selectedEntry.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(payload.error || 'Delete failed');
      }

      const nextPage =
        entries.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await fetchEntries(nextPage);
      }
      toast.success('Entry deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete entry');
    }
  };

  const isAdmin = session?.role === 'admin';
  const canEditEntry = (entry: CarbonLedgerEntry) =>
    isAdmin || (!entry.factorOverridden && session?.user?.id === entry.createdByUserId);
  const canDeleteEntry = (entry: CarbonLedgerEntry) => Boolean(isAdmin && !entry.notionPageId);
  const getNotionBadgeState = (entry: CarbonLedgerEntry) =>
    getLedgerNotionBadgeState(entry, notionStatus);
  const recentEntryHistory = entryHistory.slice(0, 3);

  // Export to CSV
  const handleExport = useCallback(async () => {
    if (totalEntries === 0) {
      toast.error('No ledger entries match the current filters');
      return;
    }

    try {
      const params = new URLSearchParams({
        companyId,
        page: '1',
        pageSize: String(Math.min(Math.max(totalEntries, LEDGER_PAGE_SIZE), 5000)),
      });

      if (selectedFacilityId) {
        params.set('departmentId', selectedFacilityId);
      }

      if (search.trim()) {
        params.set('search', search.trim());
      }

      if (sourceFilter !== 'all') {
        params.set('sourceType', sourceFilter);
      }

      if (scopeFilter !== 'all') {
        params.set('scope', scopeFilter);
      }

      const response = await fetch(`/api/ledger?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to export ledger entries' }));
        throw new Error(payload.error || 'Failed to export ledger entries');
      }

      const payload = (await response.json()) as PaginatedLedgerEntriesResponse;
      const exportEntries = payload.data;

      if (exportEntries.length === 0) {
        toast.error('No ledger entries match the current filters');
        return;
      }

      const headers = [
        'ID',
        'Source Type',
        'Category',
        'Source Document',
        'Document URL',
        'Notes',
        'Activity Value',
        'Unit',
        'Emission Factor',
        'Emission Factor Unit',
        'CO2 Equivalent (kg)',
        'Facility / Site',
        'Facility Code',
        'Date',
        'Reporting Period',
        'Factor Status',
        'Factor Source',
        'Factor Family',
        'Factor Year',
        'Factor Region',
        'Factor Methodology',
        'Factor GWP Basis',
        'Factor Description',
        'Override Reason',
        'Override By',
        'Override At',
      ];
      const rows = exportEntries.map(e => [
        e.id,
        e.sourceType,
        e.category,
        e.sourceDocument || '',
        e.documentUrl || '',
        e.notes || '',
        e.activityValue,
        e.activityUnit,
        e.emissionFactor,
        e.emissionFactorUnit,
        e.co2Equivalent.toFixed(2),
        e.department?.name || 'N/A',
        e.department?.code || '',
        new Date(e.transactionDate).toLocaleDateString(),
        e.reportingPeriod,
        e.factorOverridden ? 'Overridden' : 'Approved',
        e.factorSource || '',
        e.factorSourceFamily || '',
        e.factorYear ?? '',
        e.factorRegion || '',
        e.factorMethodology || '',
        e.factorGwpBasis || '',
        e.factorDescription || '',
        e.factorOverrideReason || '',
        e.factorOverrideByName || '',
        e.factorOverrideAt ? new Date(e.factorOverrideAt).toLocaleString() : '',
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carbon-ledger-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportEntries.length} ledger entr${exportEntries.length === 1 ? 'y' : 'ies'} to CSV`);
    } catch (error) {
      console.error('Error exporting ledger entries:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export ledger entries');
    }
  }, [companyId, scopeFilter, search, selectedFacilityId, sourceFilter, totalEntries]);

  const notionLinkedCount = ledgerSummary.notionLinkedCount ?? ledgerSummary.notionSyncedCount;
  const notionLinkReviewCount = ledgerSummary.notionLinkReviewCount ?? 0;
  const notionPendingCount =
    ledgerSummary.notionPendingCount ??
    Math.max(totalEntries - notionLinkedCount - notionLinkReviewCount, 0);
  const notionSyncRate =
    totalEntries > 0 ? Math.round((notionLinkedCount / totalEntries) * 100) : 0;
  const syncAttentionCount = notionPendingCount + notionLinkReviewCount;
  const pageStart = totalEntries === 0 ? 0 : (page - 1) * LEDGER_PAGE_SIZE + 1;
  const pageEnd = Math.min(page * LEDGER_PAGE_SIZE, totalEntries);

  return (
      <div className="space-y-6">
        <DashboardHeroCard
          title="Carbon Ledger"
          description="Track, review, and manage emissions records across facilities from one operational ledger."
          icon={<Database className="h-8 w-8" />}
          gradientClassName="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500"
          eyebrow="Emissions Record"
        eyebrowIcon={<Database className="h-3.5 w-3.5" />}
      />

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Summary cards reflect all records matching the current filters. The table below shows the current page.
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-emerald-100/80 bg-white/90 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Emissions in Scope</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatCo2e(ledgerSummary.totalCo2e)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Across {totalEntries} filtered entr{totalEntries === 1 ? 'y' : 'ies'}
                  </p>
                </div>
                <Leaf className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-100/80 bg-white/90 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Records in Scope</p>
                  <p className="text-2xl font-bold text-emerald-700">{totalEntries}</p>
                  <p className="text-xs text-muted-foreground">
                    Across {new Set(entries.map((entry) => entry.departmentId)).size || 0} facilities shown on this page
                  </p>
                </div>
                <Database className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-100/80 bg-white/90 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Sync Attention</p>
                  <p className="text-2xl font-bold text-amber-700">{syncAttentionCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {!notionStatus?.configured || !notionStatus.ledgerConfigured
                      ? 'Configure the Notion ledger database to link records automatically'
                      : !notionStatus.syncEnabled
                        ? 'Automatic ledger sync is disabled in Notion settings'
                        : syncAttentionCount === 0
                          ? 'Every filtered record is already linked to Notion'
                          : notionLinkReviewCount > 0 && notionPendingCount === 0
                            ? `${notionLinkReviewCount} record${notionLinkReviewCount === 1 ? '' : 's'} need a Notion link refresh`
                            : notionPendingCount > 0 && notionLinkReviewCount === 0
                              ? `${notionPendingCount} record${notionPendingCount === 1 ? '' : 's'} still waiting for a first Notion link`
                              : `${notionLinkReviewCount} need relink review and ${notionPendingCount} still waiting for a first link`}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-100/80 bg-white/90 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Notion Sync Coverage</p>
                  <p className="text-2xl font-bold text-purple-700">{notionLinkedCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {notionLinkReviewCount > 0
                      ? `${notionSyncRate}% linked directly • ${notionLinkReviewCount} need relink review`
                      : `${notionSyncRate}% of filtered records already synced`}
                  </p>
                </div>
                <ExternalLink className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by document, notes, facility, factor source, or unit..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={sourceFilter}
              onValueChange={(value) => {
                setSourceFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="electricity">Electricity</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="gas">Natural Gas</SelectItem>
                <SelectItem value="waste">Waste</SelectItem>
                <SelectItem value="water">Water</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={scopeFilter}
              onValueChange={(value) => {
                setScopeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="Scope 1">Scope 1</SelectItem>
                <SelectItem value="Scope 2">Scope 2</SelectItem>
                <SelectItem value="Scope 3">Scope 3</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" className="gap-2" onClick={refreshEntries}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
        <Card>
          <CardHeader>
            <CardTitle>Entries</CardTitle>
          </CardHeader>
          <CardContent>
          {loadError && !isLoading && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-medium">Ledger data is unavailable right now.</p>
              <p className="mt-1">{loadError}</p>
            </div>
          )}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border animate-pulse">
                  <div className="h-10 w-10 bg-muted rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/4 bg-muted rounded" />
                    <div className="h-3 w-1/3 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No entries found</p>
              <p className="text-sm">Add entries through the Data Ingest tab</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] rounded-lg border">
              <Table
                className="min-w-[1120px]"
                containerClassName="overflow-visible"
              >
                <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-30 [&_th]:bg-emerald-50/96 [&_th]:px-4 [&_th]:py-3 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:text-emerald-950 [&_th]:backdrop-blur-sm [&_th]:shadow-[inset_0_-1px_0_rgba(16,185,129,0.2),0_1px_0_rgba(255,255,255,0.9)]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[240px]">Source</TableHead>
                    <TableHead className="w-[120px]">Scope</TableHead>
                    <TableHead className="w-[150px]">Activity</TableHead>
                    <TableHead className="w-[210px]">Applied Factor</TableHead>
                    <TableHead className="w-[130px]">CO2e</TableHead>
                    <TableHead className="w-[190px]">Facility / Site</TableHead>
                    <TableHead className="w-[150px]">Date</TableHead>
                    <TableHead className="w-[170px]">Notion</TableHead>
                    <TableHead className="w-[56px]" />
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_td]:px-4 [&_td]:py-3.5 [&_td]:align-top">
                  {entries.map((entry) => {
                    const co2eDisplay = getCo2eDisplay(entry.co2Equivalent);
                    const notionBadgeState = getLedgerNotionBadgeState(entry, notionStatus);

                    return (
                      <TableRow key={entry.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          {getSourceIcon(entry.sourceType as SourceType)}
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-medium capitalize">{entry.sourceType}</p>
                            {entry.sourceDocument && (
                              <p className="max-w-[180px] truncate text-xs text-muted-foreground">
                                {entry.sourceDocument}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getScopeBadge(entry.category as EmissionScope)}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{entry.activityValue.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{entry.activityUnit}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-mono text-sm">{entry.emissionFactor}</p>
                          <p className="text-xs text-muted-foreground">{entry.emissionFactorUnit}</p>
                          <Badge variant="outline" className={getFactorStatusBadgeClass(entry)}>
                            {entry.factorOverridden ? 'Overridden' : entry.factorSourceFamily || 'Approved'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-green-600 dark:text-green-400">
                          {co2eDisplay.formattedValue}
                        </div>
                        <p className="text-xs text-muted-foreground">{co2eDisplay.unit}</p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{entry.department?.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{entry.department?.code || 'No code'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{new Date(entry.transactionDate).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">{entry.reportingPeriod}</p>
                      </TableCell>
                      <TableCell>
                        {entry.notionPageId ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-1 text-purple-600"
                            onClick={() => {
                              window.open(
                                `https://notion.so/${(entry.notionPageId ?? '').replace(/-/g, '')}`,
                                '_blank'
                              );
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                        ) : (
                          <Badge
                            variant="outline"
                            className={notionBadgeState.className}
                          >
                            {notionBadgeState.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="mt-0.5">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedEntry(entry)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canEditEntry(entry) && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedEntry(entry);
                                setEditForm({
                                  activityValue: entry.activityValue.toString(),
                                  notes: entry.notes || '',
                                });
                                setIsEditDialogOpen(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Entry
                              </DropdownMenuItem>
                            )}
                            {canDeleteEntry(entry) && <DropdownMenuSeparator />}
                              {canDeleteEntry(entry) && (
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedEntry(entry);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          <div className="mt-6">
            <PaginationFooter
              summary={`Showing ${pageStart}-${pageEnd} of ${totalEntries} entries • ${LEDGER_PAGE_SIZE} per page`}
              page={page}
              totalPages={totalPages}
              isLoading={isLoading}
              previousDisabled={page <= 1}
              nextDisabled={page >= totalPages}
              onPrevious={() => setPage(prev => Math.max(1, prev - 1))}
              onNext={() => setPage(prev => Math.min(totalPages, prev + 1))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Entry Details Dialog */}
      <Dialog
        open={!!selectedEntry && !isEditDialogOpen && !isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEntry(null);
          }
        }}
      >
        <DashboardDialogContentShell size="xl">
          <DashboardDialogIntro
            badge="Ledger detail"
            title="Entry Details"
            description="Complete information for this carbon ledger entry."
          />
          {selectedEntry && (
            <DashboardDialogBody className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Source Type</p>
                  <p className="font-medium capitalize flex items-center gap-2">
                    {getSourceIcon(selectedEntry.sourceType as SourceType)}
                    {selectedEntry.sourceType}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Scope</p>
                  {getScopeBadge(selectedEntry.category as EmissionScope)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Activity</p>
                  <p className="font-medium">
                    {selectedEntry.activityValue.toLocaleString()} {selectedEntry.activityUnit}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Applied Factor</p>
                  <p className="font-mono">
                    {selectedEntry.emissionFactor} {selectedEntry.emissionFactorUnit}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">CO2 Equivalent</p>
                  <p className="font-bold text-green-600 text-lg">
                    {formatCo2e(selectedEntry.co2Equivalent)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Facility / Site</p>
                  <p className="font-medium">{selectedEntry.department?.name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Transaction Date</p>
                  <p className="font-medium">
                    {new Date(selectedEntry.transactionDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Reporting Period</p>
                  <p className="font-medium">{selectedEntry.reportingPeriod}</p>
                </div>
              </div>
              
              {selectedEntry.sourceDocument && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Source Document</p>
                  <div className="space-y-2">
                    <p className="font-medium">{selectedEntry.sourceDocument}</p>
                    {selectedEntry.documentUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        asChild
                      >
                        <a
                          href={selectedEntry.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open evidence file
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {selectedEntry.notes && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{selectedEntry.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/30 p-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">{selectedEntry.createdByName || 'System import'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Last Updated By</p>
                  <p className="font-medium">{selectedEntry.updatedByName || selectedEntry.createdByName || 'System import'}</p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Factor Provenance</p>
                    <p className="text-sm text-muted-foreground">
                      Traceability for the exact factor version applied to this entry.
                    </p>
                  </div>
                  <Badge variant="outline" className={getFactorStatusBadgeClass(selectedEntry)}>
                    {getFactorStatusLabel(selectedEntry)}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Source</p>
                    <p className="font-medium">{selectedEntry.factorSource || 'Not recorded'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Source Family</p>
                    <p className="font-medium">{selectedEntry.factorSourceFamily || 'Not recorded'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Factor Year</p>
                    <p className="font-medium">{selectedEntry.factorYear ?? 'Not recorded'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Region</p>
                    <p className="font-medium">{selectedEntry.factorRegion || 'Default'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Methodology</p>
                    <p className="font-medium break-words">
                      {selectedEntry.factorMethodology || 'Not recorded'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">GWP Basis</p>
                    <p className="font-medium">{selectedEntry.factorGwpBasis || 'Not recorded'}</p>
                  </div>
                  {selectedEntry.factorDescription && (
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="font-medium">{selectedEntry.factorDescription}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedEntry.factorOverridden && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Custom factor override applied
                    </p>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-amber-800 dark:text-amber-200">
                    <p>
                      Reason: {selectedEntry.factorOverrideReason || 'No reason recorded'}
                    </p>
                    <p>
                      Applied by {selectedEntry.factorOverrideByName || 'Admin'}{selectedEntry.factorOverrideAt
                        ? ` on ${new Date(selectedEntry.factorOverrideAt).toLocaleString()}`
                        : ''}
                    </p>
                  </div>
                </div>
              )}
              
              {selectedEntry.notionPageId && (
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-purple-700 dark:text-purple-400 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Synced to Notion on {new Date(selectedEntry.notionSyncedAt!).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="rounded-lg border bg-muted/20 p-4">
                {(() => {
                  const badgeState = getNotionBadgeState(selectedEntry);

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Notion Sync</p>
                        <Badge variant="outline" className={badgeState.className}>
                          {badgeState.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{badgeState.description}</p>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Recent Activity</p>
                    <p className="text-sm text-muted-foreground">
                      The latest audit events stay here. Use Audit Center for the full investigation view.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isHistoryLoading && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {isAdmin && onOpenAuditCenter && (
                      <Button variant="outline" size="sm" onClick={openSelectedEntryInAuditCenter}>
                        Open in Audit Center
                      </Button>
                    )}
                  </div>
                </div>

                {entryHistory.length === 0 && !isHistoryLoading ? (
                  <p className="text-sm text-muted-foreground">
                    No audit events recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {entryHistory.length > recentEntryHistory.length && (
                      <p className="text-xs text-muted-foreground">
                        Showing the latest {recentEntryHistory.length} of {entryHistory.length} audit events for this record.
                      </p>
                    )}
                    {recentEntryHistory.map((historyItem) => {
                      return (
                        <div
                          key={historyItem.id}
                          className="rounded-lg border bg-background/80 p-3 shadow-sm"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{formatAuditAction(historyItem.action)}</Badge>
                                <span className="text-sm font-medium">{getAuditActor(historyItem)}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {getAuditSummary(historyItem)}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(historyItem.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </DashboardDialogBody>
          )}
        </DashboardDialogContentShell>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DashboardDialogContentShell size="lg">
          <DashboardDialogIntro
            badge="Entry update"
            title="Edit Entry"
            description="Modify the entry details. CO2 equivalent will be recalculated after you save."
          />
          <DashboardDialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activityValue">Activity Value</Label>
              <Input
                id="activityValue"
                type="number"
                value={editForm.activityValue}
                onChange={e => setEditForm(prev => ({ ...prev, activityValue: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </DashboardDialogBody>
          <DialogFooter className="border-t border-emerald-100 px-6 pt-5 pb-6 sm:px-7 sm:pb-7">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DashboardDialogContentShell>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DashboardDialogContentShell size="md">
          <DashboardDialogIntro
            badge="Entry removal"
            title="Delete Entry"
            description="Are you sure you want to delete this entry? This action cannot be undone."
          />
          <DashboardDialogBody>
            {selectedEntry && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <p className="font-medium text-red-700 dark:text-red-400">
                    {selectedEntry.sourceType.toUpperCase()} - {formatCo2e(selectedEntry.co2Equivalent)}
                  </p>
                </div>
              </div>
            )}
          </DashboardDialogBody>
          <DialogFooter className="border-t border-emerald-100 px-6 pt-5 pb-6 sm:px-7 sm:pb-7">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash className="h-4 w-4 mr-2" />
              Delete Entry
            </Button>
          </DialogFooter>
        </DashboardDialogContentShell>
      </Dialog>
    </div>
  );
}

type LedgerNotionBadgeState = {
  label: string;
  description: string;
  className: string;
};

function getLedgerNotionBadgeState(
  entry: CarbonLedgerEntry,
  notionStatus: NotionStatus | null
): LedgerNotionBadgeState {
  const hasRecordedSuccessfulSync =
    Boolean(entry.notionSyncedAt) &&
    ['exported', 'updated', 'linked_existing'].includes(entry.notionSyncStatus || '');

  if (entry.notionPageId) {
    return {
      label: 'Synced to Notion',
      description: entry.notionSyncedAt
        ? `Last synced on ${new Date(entry.notionSyncedAt).toLocaleDateString()}. Future edits update the same Notion record automatically.`
        : 'This entry is already linked to a Notion record.',
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    };
  }

  if (!notionStatus?.configured || !notionStatus.ledgerConfigured) {
    return {
      label: 'Notion not configured',
      description: 'Add a Notion API key and ledger database to enable automatic sync.',
      className: 'border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300',
    };
  }

  if (!notionStatus.syncEnabled) {
    return {
      label: 'Auto-sync disabled',
      description: 'Turn automatic ledger sync back on in Notion settings.',
      className: 'border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300',
    };
  }

  if (entry.notionSyncStatus === 'missing_remote_page') {
    return {
      label: 'Notion link missing',
      description: 'The previously linked Notion page could not be found. Saving this entry again will try to relink it.',
      className: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300',
    };
  }

  if (hasRecordedSuccessfulSync) {
    return {
      label: 'Relink needed',
      description: `A successful Notion sync was recorded${entry.notionSyncedAt ? ` on ${new Date(entry.notionSyncedAt).toLocaleDateString()}` : ''}, but the page link is no longer attached locally. Refreshing or saving this entry again will try to relink it.`,
      className: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300',
    };
  }

  return {
    label: 'Awaiting Notion link',
    description: 'This entry is set to auto-sync, but a Notion page has not been linked yet.',
    className: 'border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300',
  };
}

function getFactorStatusLabel(entry: CarbonLedgerEntry) {
  if (entry.factorOverridden) {
    return 'Overridden';
  }

  if (entry.factorSourceFamily === 'EPA') {
    return 'Official';
  }

  return entry.factorSourceFamily || 'Approved';
}

function getFactorStatusBadgeClass(entry: CarbonLedgerEntry) {
  if (entry.factorOverridden) {
    return 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300';
  }

  if (entry.factorSourceFamily === 'EPA') {
    return 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300';
  }

  if (entry.factorSourceFamily === 'SUPPLEMENTAL') {
    return 'border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-300';
  }

  return 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300';
}

function escapeCsvValue(value: unknown) {
  const stringValue = String(value ?? '');
  const escaped = stringValue.replace(/"/g, '""');
  return /[",\n]/.test(stringValue) ? `"${escaped}"` : escaped;
}
