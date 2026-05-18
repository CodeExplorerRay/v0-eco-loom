'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Leaf,
  Upload,
  Database,
  Target,
  FileText,
  Settings,
  BarChart3,
  RefreshCw,
  Sparkles,
  Loader2,
  Menu,
  X,
  type LucideIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  LogOut,
  ShieldCheck,
  Bot,
  Building2,
  Factory,
  Package,
  Store,
  FlaskConical,
  MapPin,
  Globe2,
  Plus,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { GapAnalysisSummary } from '@/components/dashboard/gap-analysis-summary';
import { EmissionsPieChart } from '@/components/charts/emissions-pie-chart';
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart';
import { DepartmentBarChart } from '@/components/charts/department-bar-chart';
import { useDashboard } from '@/hooks/use-dashboard';
import { DataIngestTab } from '@/components/dashboard/data-ingest-tab';
import { CarbonLedgerTab } from '@/components/dashboard/carbon-ledger-tab';
import { GoalsTab } from '@/components/dashboard/goals-tab';
import { ReportsTab } from '@/components/dashboard/reports-tab';
import { AuditCenterTab } from '@/components/dashboard/audit-center-tab';
import { NotionSetupTab } from '@/components/dashboard/notion-setup-tab';
import { UsersTab } from '@/components/dashboard/users-tab';
import { AgentRunsTab } from '@/components/dashboard/agent-runs-tab';
import { CompanySettingsTab } from '@/components/dashboard/company-settings-tab';
import { SystemStatusCard } from '@/components/dashboard/system-status-card';
import { NotionHelpCenterTab } from '@/components/dashboard/notion-help-center-tab';
import {
  COUNTRY_OPTIONS,
  FACILITY_BLUEPRINTS,
  getCountryLabel,
  getFacilityBlueprint,
  suggestFacilityCode,
} from '@/lib/facility-blueprints';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AuditCenterRequest, Department, FacilityType, SessionInfo } from '@/lib/types';

const DEMO_COMPANY_ID = 'demo-company-1';
const DASHBOARD_ACTIVE_TAB_STORAGE_KEY = 'eco-loom-dashboard-active-tab';

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'ingest', label: 'Data Ingest', icon: Upload },
  { id: 'ledger', label: 'Carbon Ledger', icon: Database },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'audit', label: 'Audit Center', icon: ShieldCheck, adminOnly: true },
  { id: 'agent-runs', label: 'Agent Runs', icon: Bot, adminOnly: true },
  { id: 'company-settings', label: 'Company Settings', icon: Building2, adminOnly: true },
  { id: 'notion', label: 'Notion MCP', icon: Settings, adminOnly: true },
  { id: 'notion-help', label: 'Ops Atlas', icon: BookOpen, adminOnly: true },
  { id: 'users', label: 'Users', icon: Users, adminOnly: true },
];

const facilityBlueprintIcons: Record<FacilityType, LucideIcon> = {
  production_campus: Factory,
  hq_office: Building2,
  logistics_hub: Package,
  retail_studio: Store,
  innovation_lab: FlaskConical,
};

function getUserInitials(name?: string) {
  if (!name) return 'U';

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'U';
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

export function DashboardShell() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [auditRequest, setAuditRequest] = useState<AuditCenterRequest | null>(null);
  const [facilities, setFacilities] = useState<Department[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [isFacilityDialogOpen, setIsFacilityDialogOpen] = useState(false);
  const [isDeleteFacilityDialogOpen, setIsDeleteFacilityDialogOpen] = useState(false);
  const [isFacilitySubmitting, setIsFacilitySubmitting] = useState(false);
  const [facilityDeleteBlockers, setFacilityDeleteBlockers] = useState<{
    ledgerEntries: number;
    goals: number;
  } | null>(null);
  const [isFacilityCodeManual, setIsFacilityCodeManual] = useState(false);
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    code: '',
    locationDetail: '',
    address: '',
    countryCode: '',
    facilityType: '' as FacilityType | '',
    budget: '',
  });

  const {
    metrics,
    emissionsByCategory,
    monthlyEmissions,
    departmentEmissions,
    activityFeed,
    gapAnalysis,
    isLoading,
    refresh,
  } = useDashboard(DEMO_COMPANY_ID, selectedFacilityId);

  const handleGlobalSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'to_notion' }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Synced ${result.syncedItems || 0} items to Notion`);
        refresh();
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Failed to sync with Notion');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchFacilities = useCallback(async () => {
    try {
      const response = await fetch(`/api/departments?companyId=${DEMO_COMPANY_ID}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to load facilities');
      }

      const data = (await response.json()) as Department[];
      setFacilities(data);
      setSelectedFacilityId((current) =>
        current && data.some((facility) => facility.id === current) ? current : null
      );
    } catch (error) {
      console.error('Error fetching facilities:', error);
      setFacilities([]);
      setSelectedFacilityId(null);
    }
  }, []);

  const resetFacilityForm = useCallback(() => {
    setFacilityForm({
      name: '',
      code: '',
      locationDetail: '',
      address: '',
      countryCode: '',
      facilityType: '',
      budget: '',
    });
    setIsFacilityCodeManual(false);
  }, []);

  const handleCreateFacility = useCallback(async () => {
    if (
      !facilityForm.name.trim() ||
      !facilityForm.code.trim() ||
      !facilityForm.countryCode ||
      !facilityForm.facilityType
    ) {
      toast.error('Name, site key, country, and facility blueprint are required');
      return;
    }

    setIsFacilitySubmitting(true);
    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: DEMO_COMPANY_ID,
          name: facilityForm.name.trim(),
          code: facilityForm.code.trim().toUpperCase(),
          locationDetail: facilityForm.locationDetail.trim(),
          address: facilityForm.address.trim(),
          country: getCountryLabel(facilityForm.countryCode),
          facilityType: facilityForm.facilityType,
          budget: facilityForm.budget.trim() ? Number.parseFloat(facilityForm.budget) : null,
        }),
      });

      const result = (await response.json()) as Department & { error?: string };
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create facility / site');
      }

      await fetchFacilities();
      setSelectedFacilityId(result.id);
      setIsFacilityDialogOpen(false);
      resetFacilityForm();
      await refresh();
      toast.success(`Created facility / site ${result.name}`);
    } catch (error) {
      console.error('Error creating facility:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create facility / site');
    } finally {
      setIsFacilitySubmitting(false);
    }
  }, [
    facilityForm.address,
    facilityForm.budget,
    facilityForm.code,
    facilityForm.countryCode,
    facilityForm.facilityType,
    facilityForm.locationDetail,
    facilityForm.name,
    fetchFacilities,
    refresh,
    resetFacilityForm,
  ]);

  const handleDeleteFacility = useCallback(async (forceDelete = false) => {
    if (!selectedFacilityId) {
      return;
    }

    setIsFacilitySubmitting(true);
    try {
      const params = new URLSearchParams({
        companyId: DEMO_COMPANY_ID,
      });
      if (forceDelete) {
        params.set('force', 'true');
      }

      const response = await fetch(
        `/api/departments/${selectedFacilityId}?${params.toString()}`,
        {
          method: 'DELETE',
        }
      );
      const result = (await response.json()) as {
        error?: string;
        canForceDelete?: boolean;
        blockingRecords?: { ledgerEntries?: number; goals?: number };
        deletedCounts?: { ledgerEntries?: number; goals?: number };
      };
      if (!response.ok) {
        if (response.status === 409 && result.blockingRecords && !forceDelete) {
          setFacilityDeleteBlockers({
            ledgerEntries: result.blockingRecords.ledgerEntries ?? 0,
            goals: result.blockingRecords.goals ?? 0,
          });
          toast.error('This facility still has site data. Review the delete options below.');
          return;
        }
        throw new Error(result.error || 'Failed to delete facility / site');
      }

      setFacilityDeleteBlockers(null);
      setSelectedFacilityId(null);
      await fetchFacilities();
      setIsDeleteFacilityDialogOpen(false);
      await refresh();
      if (forceDelete && result.deletedCounts) {
        toast.success(
          `Facility deleted with ${result.deletedCounts.ledgerEntries ?? 0} ledger entries and ${
            result.deletedCounts.goals ?? 0
          } goals removed`
        );
      } else {
        toast.success('Facility / site deleted');
      }
    } catch (error) {
      console.error('Error deleting facility:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete facility / site');
    } finally {
      setIsFacilitySubmitting(false);
    }
  }, [fetchFacilities, refresh, selectedFacilityId]);

  const handleNavigation = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const handleOpenAuditCenter = useCallback(
    (filters: AuditCenterRequest['filters'], title?: string) => {
      setAuditRequest({
        key: Date.now(),
        filters,
        title,
      });
      setActiveTab('audit');
      setMobileMenuOpen(false);
    },
    []
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/session', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to log out');
      }

      toast.success('Logged out successfully');
      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as SessionInfo;
        if (active) {
          setSession(data);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        if (active) {
          setSessionResolved(true);
        }
      }
    };

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void fetchFacilities();
  }, [fetchFacilities]);

  useEffect(() => {
    if (!isFacilityDialogOpen || isFacilityCodeManual) {
      return;
    }

    const suggestedCode = suggestFacilityCode(facilityForm.name, facilityForm.countryCode);
    setFacilityForm((prev) =>
      prev.code === suggestedCode ? prev : { ...prev, code: suggestedCode }
    );
  }, [
    facilityForm.countryCode,
    facilityForm.name,
    isFacilityCodeManual,
    isFacilityDialogOpen,
  ]);

  const isAdmin = session?.role === 'admin';
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);
  const userInitials = getUserInitials(session?.user?.name);
  const footerIdentityName = session?.user?.name || (sessionResolved ? 'Workspace user' : 'Loading access');
  const footerIdentityEmail =
    session?.user?.email || (sessionResolved ? 'Secure workspace session' : 'Checking session');
  const footerRoleLabel =
    session?.role === 'admin'
      ? 'Admin access'
      : session?.role === 'standard'
        ? 'Standard access'
        : sessionResolved
          ? 'Workspace access'
          : 'Loading access';
  const selectedFacility =
    facilities.find((facility) => facility.id === selectedFacilityId) || null;
  const selectedFacilityBlueprint = getFacilityBlueprint(selectedFacility?.facilityType);
  const SelectedFacilityIcon = selectedFacility?.facilityType
    ? facilityBlueprintIcons[selectedFacility.facilityType]
    : Building2;
  const activeFacilityBlueprint = getFacilityBlueprint(facilityForm.facilityType);
  const facilityCountryLabel = getCountryLabel(facilityForm.countryCode);
  const facilityFieldClassName =
    'border-emerald-200 bg-white shadow-sm focus-visible:border-emerald-400 focus-visible:ring-emerald-500';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!sessionResolved) {
      return;
    }

    const storedTab = window.sessionStorage.getItem(DASHBOARD_ACTIVE_TAB_STORAGE_KEY);
    if (!storedTab) {
      return;
    }

    const storedItem = navItems.find((item) => item.id === storedTab);
    if (!storedItem) {
      return;
    }

    if (storedItem.adminOnly && !isAdmin) {
      window.sessionStorage.removeItem(DASHBOARD_ACTIVE_TAB_STORAGE_KEY);
      return;
    }

    setActiveTab(storedTab);
  }, [isAdmin, sessionResolved]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(DASHBOARD_ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col',
          'lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
          mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className={cn('flex items-center gap-3', sidebarCollapsed && 'lg:justify-center')}>
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-green-500 rounded-xl blur-md opacity-50" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                <Leaf className="h-6 w-6" />
              </div>
            </div>
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <div className="hidden lg:block">
                <h1 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Eco-Loom
                </h1>
                <p className="text-xs text-muted-foreground">ESG Platform</p>
              </div>
            )}
          </div>

          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
                  sidebarCollapsed && 'lg:justify-center lg:px-2'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {(!sidebarCollapsed || mobileMenuOpen) && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div
          className={cn(
            'p-4 border-t border-gray-200 dark:border-gray-800',
            sidebarCollapsed && 'lg:p-2'
          )}
        >
          <div className={cn('space-y-3', sidebarCollapsed && 'lg:space-y-2')}>
            {(!sidebarCollapsed || mobileMenuOpen) ? (
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-green-50 p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-sm font-semibold text-white shadow-sm">
                    {userInitials}
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {footerIdentityName}
                      </p>
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-white/80 text-emerald-700"
                      >
                        {footerRoleLabel}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {footerIdentityEmail}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Session active</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div
                  className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-sm font-semibold text-white shadow-sm"
                  title={footerIdentityName}
                >
                  {userInitials}
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                </div>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            className={cn(
              'mt-3 w-full gap-2 border-emerald-100 bg-white/90 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700',
              sidebarCollapsed && 'lg:px-2'
            )}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {(!sidebarCollapsed || mobileMenuOpen) && <span>Log out</span>}
          </Button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-full mt-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-muted-foreground transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-4 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border bg-white/80 p-2 shadow-sm hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900/80 dark:hover:bg-gray-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleGlobalSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>Sync</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                <span>Log out</span>
              </Button>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 text-white">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Welcome to Eco-Loom</h2>
                      <p className="text-green-100 max-w-xl">
                        Your autonomous ESG & Carbon Compliance Agent. Track emissions, analyze
                        gaps, and generate compliance reports with intelligent reporting insights synced to
                        your Notion workspace.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-emerald-200/80 bg-white shadow-sm dark:border-emerald-900/60 dark:bg-gray-900/80">
                <CardContent className="p-4 lg:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <SelectedFacilityIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                          >
                            Dashboard facility scope
                          </Badge>
                          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            {facilities.length} site{facilities.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h3 className="truncate text-lg font-semibold text-slate-950 dark:text-white">
                            {selectedFacility?.name || 'All facilities'}
                          </h3>
                          {selectedFacility && (
                            <Badge
                              variant="secondary"
                              className="w-fit bg-emerald-100 text-emerald-700"
                            >
                              {selectedFacility.country || 'Country not set'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[560px] lg:items-end">
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
                        <div className="space-y-2 sm:flex-1 lg:w-[280px] lg:flex-none">
                        <Label
                          htmlFor="facility-scope"
                          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                        >
                          Facility view
                        </Label>
                        <Select
                          value={selectedFacilityId || 'all'}
                          onValueChange={(value) =>
                            setSelectedFacilityId(value === 'all' ? null : value)
                          }
                        >
                          <SelectTrigger
                            id="facility-scope"
                            className="h-11 w-full rounded-2xl border-slate-300 bg-white text-left shadow-sm focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                          >
                            <SelectValue placeholder="Select facility or site" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All facilities</SelectItem>
                            {facilities.map((facility) => (
                              <SelectItem key={facility.id} value={facility.id}>
                                {facility.name} ({facility.code})
                                {facility.country ? ` - ${facility.country}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            className="h-11 shrink-0 gap-2 rounded-2xl border-slate-200 bg-white px-4 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                            onClick={() => {
                              resetFacilityForm();
                              setIsFacilityDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            New Facility
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="outline"
                            className="h-11 shrink-0 gap-2 rounded-2xl border-red-200 bg-white px-4 text-red-600 shadow-sm hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:border-slate-200 disabled:text-slate-400 dark:border-red-950/80 dark:bg-slate-950 dark:text-red-400 dark:hover:bg-red-950/20"
                            disabled={!selectedFacility}
                            onClick={() => {
                              setFacilityDeleteBlockers(null);
                              setIsDeleteFacilityDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Facility
                          </Button>
                        )}
                      </div>

                    </div>
                  </div>
                </CardContent>
              </Card>

              <MetricCards data={metrics} isLoading={isLoading} />
              <GapAnalysisSummary data={gapAnalysis} isLoading={isLoading} />

              <div className="grid gap-6 md:grid-cols-2">
                <EmissionsPieChart data={emissionsByCategory} isLoading={isLoading} />
                <DepartmentBarChart data={departmentEmissions} isLoading={isLoading} />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                  <MonthlyTrendChart data={monthlyEmissions} isLoading={isLoading} />
                </div>
                <ActivityFeed
                  data={activityFeed}
                  isLoading={isLoading}
                  isAdminView={isAdmin}
                  onOpenAuditCenter={isAdmin ? handleOpenAuditCenter : undefined}
                />
              </div>

              <SystemStatusCard companyId={DEMO_COMPANY_ID} />
            </div>
          )}

          {activeTab === 'ingest' && (
            <DataIngestTab
              companyId={DEMO_COMPANY_ID}
              session={session}
              selectedFacilityId={selectedFacilityId}
            />
          )}
          {activeTab === 'ledger' && (
            <CarbonLedgerTab
              companyId={DEMO_COMPANY_ID}
              selectedFacilityId={selectedFacilityId}
              onOpenAuditCenter={handleOpenAuditCenter}
            />
          )}
          {activeTab === 'goals' && (
            <GoalsTab
              companyId={DEMO_COMPANY_ID}
              selectedFacilityId={selectedFacilityId}
              onOpenAuditCenter={isAdmin ? handleOpenAuditCenter : undefined}
            />
          )}
          {activeTab === 'reports' && (
            <ReportsTab
              companyId={DEMO_COMPANY_ID}
              session={session}
              selectedFacility={selectedFacility}
              onOpenAuditCenter={isAdmin ? handleOpenAuditCenter : undefined}
            />
          )}
          {activeTab === 'audit' && isAdmin && <AuditCenterTab request={auditRequest} />}
          {activeTab === 'agent-runs' && isAdmin && <AgentRunsTab />}
          {activeTab === 'company-settings' && isAdmin && <CompanySettingsTab />}
          {activeTab === 'notion' && (
            <NotionSetupTab
              onOpenAuditCenter={isAdmin ? handleOpenAuditCenter : undefined}
              onOpenKnowledgeBase={isAdmin ? () => setActiveTab('notion-help') : undefined}
            />
          )}
          {activeTab === 'notion-help' && isAdmin && <NotionHelpCenterTab />}
          {activeTab === 'users' && isAdmin && (
            <UsersTab onOpenAuditCenter={handleOpenAuditCenter} />
          )}
        </main>
      </div>

      <Dialog
        open={isFacilityDialogOpen}
        onOpenChange={(open) => {
          setIsFacilityDialogOpen(open);
          if (!open) {
            resetFacilityForm();
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto border border-emerald-100 bg-white p-0 shadow-2xl shadow-emerald-100/60 sm:max-w-5xl">
          <div className="grid overflow-hidden rounded-3xl bg-gradient-to-br from-white via-emerald-50/35 to-green-50 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 lg:p-8">
              <DialogHeader className="space-y-4 text-left">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Facility Blueprint
                </div>
                <div className="space-y-2">
                  <DialogTitle className="text-3xl font-semibold tracking-tight text-slate-950">
                    Design a new site setup
                  </DialogTitle>
                  <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600">
                    The references you shared pair location basics with smart operating guidance.
                    This version keeps that usefulness, but turns it into a more original facility
                    blueprint flow tailored to Eco-Loom.
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="mt-8 space-y-8">
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-sm font-semibold text-white shadow-sm">
                      1
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Identity and place</h3>
                      <p className="text-sm text-slate-500">
                        Capture how this site will appear across filters, ledgers, and reports.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="facility-name">Facility / Site Name</Label>
                      <Input
                        id="facility-name"
                        value={facilityForm.name}
                        onChange={(event) =>
                          setFacilityForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                        placeholder="e.g. Jakarta Fulfillment Campus"
                        className={facilityFieldClassName}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facility-code">Site Key</Label>
                      <Input
                        id="facility-code"
                        value={facilityForm.code}
                        onChange={(event) => {
                          setIsFacilityCodeManual(true);
                          setFacilityForm((prev) => ({
                            ...prev,
                            code: event.target.value.toUpperCase(),
                          }));
                        }}
                        placeholder="Auto-generated from the site name"
                        className={facilityFieldClassName}
                      />
                      <p className="text-xs text-slate-500">
                        Used in tables, filters, and report labels.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facility-country">Country</Label>
                      <Select
                        value={facilityForm.countryCode}
                        onValueChange={(value) =>
                          setFacilityForm((prev) => ({ ...prev, countryCode: value }))
                        }
                      >
                        <SelectTrigger id="facility-country" className={facilityFieldClassName}>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_OPTIONS.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facility-location-detail">Campus / Floor / Block</Label>
                      <Input
                        id="facility-location-detail"
                        value={facilityForm.locationDetail}
                        onChange={(event) =>
                          setFacilityForm((prev) => ({
                            ...prev,
                            locationDetail: event.target.value,
                          }))
                        }
                        placeholder="e.g. Building A, Level 3, Cold Chain Wing"
                        className={facilityFieldClassName}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facility-budget">Annual Budget (Optional)</Label>
                      <Input
                        id="facility-budget"
                        type="number"
                        value={facilityForm.budget}
                        onChange={(event) =>
                          setFacilityForm((prev) => ({ ...prev, budget: event.target.value }))
                        }
                        placeholder="e.g. 1500000"
                        className={facilityFieldClassName}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="facility-address">Address</Label>
                      <Input
                        id="facility-address"
                        value={facilityForm.address}
                        onChange={(event) =>
                          setFacilityForm((prev) => ({ ...prev, address: event.target.value }))
                        }
                        placeholder="e.g. 88 Harbour Logistics Avenue, Jakarta"
                        className={facilityFieldClassName}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-sm font-semibold text-white shadow-sm">
                      2
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Choose a site blueprint</h3>
                      <p className="text-sm text-slate-500">
                        This shapes the guidance the platform surfaces for this facility. It does
                        not limit what you can track.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {FACILITY_BLUEPRINTS.map((blueprint) => {
                      const BlueprintIcon = facilityBlueprintIcons[blueprint.value];
                      const isActive = facilityForm.facilityType === blueprint.value;

                      return (
                        <button
                          key={blueprint.value}
                          type="button"
                          onClick={() =>
                            setFacilityForm((prev) => ({
                              ...prev,
                              facilityType: blueprint.value,
                            }))
                          }
                          className={cn(
                            'group rounded-3xl border p-5 text-left transition-all',
                            isActive
                              ? 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
                              : 'border-emerald-100 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md'
                          )}
                        >
                          <div
                            className={cn(
                              'rounded-2xl border border-white/70 bg-gradient-to-br p-4',
                              blueprint.accentClassName
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-sm">
                                  <BlueprintIcon className="h-5 w-5" />
                                </div>
                                <div>
                                  <h4 className="text-base font-semibold text-slate-950">
                                    {blueprint.label}
                                  </h4>
                                  <p className="mt-1 text-sm text-slate-600">
                                    {blueprint.description}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={cn(
                                  'mt-1 h-4 w-4 rounded-full border-2',
                                  isActive
                                    ? 'border-emerald-500 bg-emerald-500 ring-4 ring-emerald-100'
                                    : 'border-emerald-200 bg-white'
                                )}
                              />
                            </div>
                            <p className="mt-4 text-sm font-medium text-slate-700">
                              {blueprint.outcome}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {blueprint.lenses.map((lens) => (
                                <span
                                  key={lens}
                                  className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700"
                                >
                                  {lens}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="font-medium">Guidance, not restriction</p>
                        <p className="mt-1 text-emerald-800/90">
                          Every facility still has full access to Scope 1, Scope 2, and Scope 3
                          tracking. The blueprint only tunes prompts, defaults, and suggested
                          review areas.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

                <DialogFooter className="mt-8 flex-col gap-3 border-t border-emerald-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Required fields: site name, site key, country, and blueprint.
                  </p>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button
                      variant="outline"
                      className="border-emerald-200 hover:bg-emerald-50"
                      onClick={() => setIsFacilityDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateFacility}
                    disabled={
                      isFacilitySubmitting ||
                      !facilityForm.name.trim() ||
                      !facilityForm.code.trim() ||
                      !facilityForm.countryCode ||
                      !facilityForm.facilityType
                    }
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {isFacilitySubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Create Facility
                  </Button>
                </div>
              </DialogFooter>
            </div>

            <div className="border-t border-emerald-100 bg-gradient-to-br from-emerald-50 via-lime-50 to-white p-6 text-slate-900 lg:border-l lg:border-t-0 lg:p-8">
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      Live Preview
                    </Badge>
                    Site Readiness
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-slate-950">
                    {facilityForm.name.trim() || 'Your next facility'}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This preview shows how the site will read across dashboard filters, reports,
                    and guidance surfaces before you save it.
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-white/90 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-emerald-700/70">
                        Site Key
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">
                        {facilityForm.code || 'Auto-generated'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-100 p-3">
                      <MapPin className="h-5 w-5 text-emerald-700" />
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span>Country</span>
                      <span className="font-medium text-slate-900">
                        {facilityCountryLabel || 'Not selected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Location detail</span>
                      <span className="max-w-[60%] text-right font-medium text-slate-900">
                        {facilityForm.locationDetail || 'Add campus, floor, or zone'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Budget</span>
                      <span className="font-medium text-slate-900">
                        {facilityForm.budget ? Number(facilityForm.budget).toLocaleString() : 'Optional'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-100 p-3">
                      {activeFacilityBlueprint ? (
                        (() => {
                          const BlueprintIcon =
                            facilityBlueprintIcons[activeFacilityBlueprint.value];
                          return <BlueprintIcon className="h-5 w-5 text-emerald-700" />;
                        })()
                      ) : (
                        <Globe2 className="h-5 w-5 text-emerald-700" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-emerald-700/70">
                        Operating Lens
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">
                        {activeFacilityBlueprint?.label || 'Choose a blueprint'}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {activeFacilityBlueprint?.outcome ||
                      'Pick the site blueprint that best matches how this facility consumes energy and creates activity.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(activeFacilityBlueprint?.lenses || ['electricity', 'travel', 'waste']).map(
                      (lens) => (
                        <span
                          key={lens}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                        >
                          {lens}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-emerald-700/80">
                    Why This Setup Feels Different
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-emerald-900/90">
                    <li>Location detail gives each site a stronger operational identity.</li>
                    <li>Blueprints make onboarding smarter without locking your category model.</li>
                    <li>Live preview keeps the setup flow polished and demo-ready.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteFacilityDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteFacilityDialogOpen(open);
          if (!open) {
            setFacilityDeleteBlockers(null);
          }
        }}
      >
        <DialogContent className="overflow-hidden border border-emerald-100 bg-white p-0 shadow-xl shadow-emerald-100/50 sm:max-w-2xl">
          <div className="grid bg-gradient-to-br from-white via-green-50/40 to-emerald-50/60 md:grid-cols-[1.05fr_0.95fr]">
            <div className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-green-50 p-6 md:border-b-0 md:border-r">
              <DialogHeader className="space-y-4 text-left">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  Facility removal
                </div>
                <div className="space-y-2">
                  <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-950">
                    Delete facility
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-slate-600">
                    Start with a protected delete. If the API finds linked site data, the modal
                    will show the counts and let you confirm a force delete.
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="mt-6 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Facility slated for deletion
                </p>
                <div className="mt-3 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-950">
                    {selectedFacility?.name || 'No facility selected'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                      {selectedFacility?.code || 'Select a facility first'}
                    </Badge>
                    {selectedFacility?.country && (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {selectedFacility.country}
                      </Badge>
                    )}
                    {selectedFacilityBlueprint && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                        {selectedFacilityBlueprint.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    {selectedFacility
                      ? 'If this facility still has activity records or goals, you can either stop here or explicitly remove the facility together with its linked site data.'
                      : 'Choose a facility from the scope selector before opening this action.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 text-slate-900">
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-emerald-700/65">
                    Safety checks
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">Deletion is intentionally strict</h3>
                </div>

                <div className="space-y-3 rounded-3xl border border-emerald-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <p>Standard delete protects ledger entries from accidental loss.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <p>Facility-level goals are counted before any force delete is offered.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <p>The site count in company settings will be recalculated automatically.</p>
                  </div>
                </div>

                {facilityDeleteBlockers && (
                  <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
                    <p className="font-medium">Linked site data found</p>
                    <p className="mt-2 leading-6 text-red-900/85">
                      This facility currently owns {facilityDeleteBlockers.ledgerEntries} ledger
                      entr{facilityDeleteBlockers.ledgerEntries === 1 ? 'y' : 'ies'} and{' '}
                      {facilityDeleteBlockers.goals} goal
                      {facilityDeleteBlockers.goals === 1 ? '' : 's'}. If you continue with force
                      delete, those facility-scoped records will be removed too.
                    </p>
                  </div>
                )}

                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                  <p className="font-medium">Current rule</p>
                  <p className="mt-2 leading-6 text-amber-900/85">
                    Standard delete protects linked site history. Force delete is available only
                    after the API confirms what would be removed.
                  </p>
                </div>

                <DialogFooter className="flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    className="border-emerald-200 bg-white hover:bg-emerald-50"
                    onClick={() => setIsDeleteFacilityDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => handleDeleteFacility(Boolean(facilityDeleteBlockers))}
                    disabled={!selectedFacility || isFacilitySubmitting}
                  >
                    {isFacilitySubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {facilityDeleteBlockers ? 'Delete Facility and Site Data' : 'Delete Facility'}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
