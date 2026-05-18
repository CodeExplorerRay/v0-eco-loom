// Reports Tab Component - Production Ready

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DashboardHeroActionButton,
  DashboardHeroCard,
} from '@/components/dashboard/dashboard-hero-card';
import { PaginationFooter } from '@/components/dashboard/pagination-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DashboardDialogBody,
  DashboardDialogContentShell,
  DashboardDialogIntro,
} from '@/components/dashboard/dashboard-dialog';
import { 
  FileBarChart, 
  Plus, 
  Download, 
  Eye, 
  Share2, 
  Clock, 
  CheckCircle2,
  FileText,
  Loader2,
  AlertTriangle,
  TrendingDown,
  BarChart3,
  Calendar,
  ShieldCheck,
  Building2,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type {
  AuditCenterRequest,
  Company,
  Department,
  GenerateReportResponse,
  PaginatedReportsResponse,
  Report,
  ReportDepartmentAnalytics,
  ReportMode,
  ReportType,
  ReportStatus,
  ReportSummaryCounts,
  ReportTrendPoint,
  SessionInfo,
  StoredGapItem,
} from '@/lib/types';
import { formatGapValue, parseStoredGapItems } from '@/lib/gap-analysis';
import { getReportModeProfile } from '@/lib/reports/report-modes';
import { formatCo2e, formatCompactCo2e } from '@/lib/utils';

interface ReportsTabProps {
  companyId: string;
  session: SessionInfo | null;
  selectedFacility?: Department | null;
  onOpenAuditCenter?: (filters: AuditCenterRequest['filters'], title?: string) => void;
}

const reportTypes: { value: ReportType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'gap_analysis', label: 'Gap Analysis', description: 'Compare actuals vs targets', icon: <AlertTriangle className="h-4 w-4" /> },
  { value: 'monthly_summary', label: 'Monthly Summary', description: 'Monthly emissions overview', icon: <Calendar className="h-4 w-4" /> },
  { value: 'quarterly_review', label: 'Quarterly Review', description: 'Quarterly performance report', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'annual_report', label: 'Annual Report', description: 'Comprehensive annual report', icon: <FileBarChart className="h-4 w-4" /> },
];

const reportModes: { value: ReportMode; label: string; description: string }[] = [
  {
    value: 'internal_management',
    label: 'Internal Management',
    description: 'Operational detail for sustainability teams.',
  },
  {
    value: 'verifier_ready',
    label: 'Verifier Ready',
    description: 'Assurance-focused pack with methodology and appendices.',
  },
  {
    value: 'board_summary',
    label: 'Board Summary',
    description: 'Condensed leadership narrative and high-level trend view.',
  },
  {
    value: 'annual_disclosure',
    label: 'Annual Disclosure',
    description: 'Standards-oriented annual disclosure format.',
  },
];

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: typeof FileText }> = {
  draft: { label: 'Draft', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: Clock },
  published: { label: 'Published', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
  archived: { label: 'Archived', color: 'bg-muted text-muted-foreground', icon: FileBarChart },
};

const REPORTS_PAGE_SIZE = 20;

type ReportTabValue = 'all' | 'published' | 'drafts' | 'archived';
type CompanyReportDefaults = Pick<
  Company,
  | 'defaultReportMode'
  | 'defaultReportingStandard'
  | 'defaultGwpBasis'
  | 'defaultFactorSourcePolicy'
  | 'defaultOverridePolicy'
  | 'defaultReportOwnerName'
  | 'defaultReportOwnerEmail'
  | 'annualDisclosureNotes'
>;

const DEFAULT_REPORT_DEFAULTS: CompanyReportDefaults = {
  defaultReportMode: 'internal_management',
  defaultReportingStandard: 'GHG Protocol Corporate Standard',
  defaultGwpBasis:
    'Mixed factor-library basis with published provenance carried per entry and disclosed in report outputs.',
  defaultFactorSourcePolicy: '',
  defaultOverridePolicy:
    'Custom factor overrides are restricted to admins and require a documented reason, actor, and timestamp.',
  defaultReportOwnerName: '',
  defaultReportOwnerEmail: '',
  annualDisclosureNotes: '',
};

export function ReportsTab({
  companyId,
  session,
  selectedFacility,
  onOpenAuditCenter,
}: ReportsTabProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [summaryCounts, setSummaryCounts] = useState<ReportSummaryCounts>({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    thisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isSelectedReportLoading, setIsSelectedReportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTabValue>('all');
  const [page, setPage] = useState(1);
  const [totalReports, setTotalReports] = useState(reports.length);
  const [totalPages, setTotalPages] = useState(1);
  const [reportDefaults, setReportDefaults] = useState<CompanyReportDefaults>(DEFAULT_REPORT_DEFAULTS);
  const [pendingApprovalReports, setPendingApprovalReports] = useState<Report[]>([]);
  const [formData, setFormData] = useState({
    reportType: '' as ReportType | '',
    reportMode: 'internal_management' as ReportMode,
    reportingPeriod: '',
  });
  const isAdmin = session?.role === 'admin';

  // Fetch reports from API
  const fetchReports = useCallback(async (nextTab?: ReportTabValue, nextPage?: number) => {
    setIsLoading(true);
    try {
      const tab = nextTab ?? activeTab;
      const targetPage = nextPage ?? page;
      const params = new URLSearchParams({
        companyId,
        page: String(targetPage),
        pageSize: String(REPORTS_PAGE_SIZE),
      });
      if (selectedFacility?.id) {
        params.set('departmentId', selectedFacility.id);
      }
      const status = getStatusForTab(tab);
      if (status) {
        params.set('status', status);
      }

      const response = await fetch(`/api/reports?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to fetch reports' }));
        throw new Error(payload.error || 'Failed to fetch reports');
      }

      const data = (await response.json()) as PaginatedReportsResponse;
      setReports(data.data);
      setSummaryCounts(data.counts);
      setTotalReports(data.total);
      setTotalPages(data.totalPages);
      setLoadError(null);
      if (data.page !== targetPage) {
        setPage(data.page);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
      setSummaryCounts({
        total: 0,
        published: 0,
        draft: 0,
        archived: 0,
        thisMonth: 0,
      });
      setTotalReports(0);
      setTotalPages(1);
      setLoadError(error instanceof Error ? error.message : 'Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, companyId, page, selectedFacility?.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let cancelled = false;
    const loadReportDefaults = async () => {
      try {
        const response = await fetch('/api/companies', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load report defaults');
        }

        const companies = (await response.json()) as Company[];
        const company = companies[0];
        const nextDefaults: CompanyReportDefaults = {
          defaultReportMode: (company?.defaultReportMode || 'internal_management') as ReportMode,
          defaultReportingStandard:
            company?.defaultReportingStandard || DEFAULT_REPORT_DEFAULTS.defaultReportingStandard,
          defaultGwpBasis: company?.defaultGwpBasis || DEFAULT_REPORT_DEFAULTS.defaultGwpBasis,
          defaultFactorSourcePolicy: company?.defaultFactorSourcePolicy || '',
          defaultOverridePolicy:
            company?.defaultOverridePolicy || DEFAULT_REPORT_DEFAULTS.defaultOverridePolicy,
          defaultReportOwnerName: company?.defaultReportOwnerName || '',
          defaultReportOwnerEmail: company?.defaultReportOwnerEmail || '',
          annualDisclosureNotes: company?.annualDisclosureNotes || '',
        };

        if (!cancelled) {
          setReportDefaults(nextDefaults);
          setFormData((prev) => ({
            ...prev,
            reportMode:
              prev.reportMode === 'internal_management' && !prev.reportType
                ? (nextDefaults.defaultReportMode || 'internal_management')
                : prev.reportMode,
          }));
        }
      } catch (error) {
        console.error('Error loading report defaults:', error);
      }
    };

    void loadReportDefaults();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let cancelled = false;
    const loadApprovalQueue = async () => {
      try {
        const response = await fetch(
          `/api/reports?companyId=${companyId}&status=draft&approvalStatus=pending_review&page=1&pageSize=5${selectedFacility?.id ? `&departmentId=${selectedFacility.id}` : ''}`,
          { cache: 'no-store' }
        );
        if (!response.ok) {
          throw new Error('Failed to load approval queue');
        }

        const data = (await response.json()) as PaginatedReportsResponse;
        if (!cancelled) {
          setPendingApprovalReports(data.data);
        }
      } catch (error) {
        console.error('Error loading approval queue:', error);
      }
    };

    void loadApprovalQueue();

    return () => {
      cancelled = true;
    };
  }, [companyId, isAdmin, selectedFacility?.id]);

  const refreshApprovalQueue = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    try {
      const response = await fetch(
        `/api/reports?companyId=${companyId}&status=draft&approvalStatus=pending_review&page=1&pageSize=5${selectedFacility?.id ? `&departmentId=${selectedFacility.id}` : ''}`,
        { cache: 'no-store' }
      );
      if (!response.ok) {
        throw new Error('Failed to load approval queue');
      }

      const data = (await response.json()) as PaginatedReportsResponse;
      setPendingApprovalReports(data.data);
    } catch (error) {
      console.error('Error refreshing approval queue:', error);
    }
  }, [companyId, isAdmin, selectedFacility?.id]);

  useEffect(() => {
    if (!selectedReport?.id) {
      return;
    }

    let cancelled = false;
    const loadSelectedReport = async () => {
      setIsSelectedReportLoading(true);
      try {
        const response = await fetch(`/api/reports/${selectedReport.id}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load report details');
        }

        const detailedReport = (await response.json()) as Report;
        if (!cancelled) {
          setSelectedReport(detailedReport);
        }
      } catch (error) {
        console.error('Error loading report details:', error);
        if (!cancelled) {
          toast.error('Failed to load full report details');
        }
      } finally {
        if (!cancelled) {
          setIsSelectedReportLoading(false);
        }
      }
    };

    void loadSelectedReport();

    return () => {
      cancelled = true;
    };
  }, [selectedReport?.id]);

  const requestReportGeneration = useCallback(
    async (
      payload: { reportType: ReportType; reportMode: ReportMode; reportingPeriod: string },
      options?: { openOnReuse?: boolean }
    ) => {
      setIsGenerating(true);
      try {
        const response = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            companyId,
            departmentId: selectedFacility?.id || null,
          }),
        });

        const result = (await response.json()) as GenerateReportResponse & { error?: string };
        if (!response.ok) {
          throw new Error(result.error || 'Failed to generate report');
        }

        setActiveTab('drafts');
        setPage(1);
        await fetchReports('drafts', 1);
        await refreshApprovalQueue();

        if (result.reused) {
          if (options?.openOnReuse) {
            setSelectedReport(result.report);
          }
          toast.info('Opened the current draft instead of creating a duplicate report.');
        } else {
          toast.success('Report generated successfully!');
        }

        return result;
      } finally {
        setIsGenerating(false);
      }
    },
    [companyId, fetchReports, refreshApprovalQueue, selectedFacility?.id]
  );

  const handleGenerate = async () => {
    if (!formData.reportType || !formData.reportingPeriod) {
      toast.error('Please select a report type and reporting period');
      return;
    }

    try {
      await requestReportGeneration({
        reportType: formData.reportType,
        reportMode: formData.reportMode,
        reportingPeriod: formData.reportingPeriod,
      });
      setFormData({ reportType: '', reportMode: 'internal_management', reportingPeriod: '' });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const response = await fetch(`/api/reports/${id}/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({ error: 'Failed to publish report' }))) as {
          error?: string;
          issues?: Array<{ title?: string }>;
        };
        const issueHint =
          result.issues && result.issues.length > 0
            ? ` ${result.issues
                .slice(0, 2)
                .map((issue) => issue.title)
                .filter(Boolean)
                .join(' · ')}`
            : '';
        throw new Error(`${result.error || 'Failed to publish report'}${issueHint}`.trim());
      }

      const updatedReport = await response.json();
      setSelectedReport(updatedReport);
      await fetchReports(activeTab, page);
      await refreshApprovalQueue();
      toast.success('Report published successfully!');
    } catch (error) {
      console.error('Error publishing report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish report');
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      toast.info('Generating PDF report...');
      
      // Fetch the PDF from the API
      const response = await fetch(`/api/reports/${report.id}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('PDF report downloaded!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  const handleVerifierExport = async (report: Report, exportFormat: 'csv' | 'json') => {
    try {
      toast.info(`Preparing verifier ${exportFormat.toUpperCase()} package...`);

      const response = await fetch(`/api/reports/${report.id}/download?export=${exportFormat}`);
      if (!response.ok) {
        throw new Error(`Failed to generate verifier ${exportFormat.toUpperCase()} package`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        getDownloadFilename(response.headers.get('Content-Disposition')) ||
        `${report.title.replace(/\s+/g, '_')}_verifier_package.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Verifier ${exportFormat.toUpperCase()} package downloaded`);
    } catch (error) {
      console.error(`Error downloading verifier ${exportFormat.toUpperCase()} package:`, error);
      toast.error(`Failed to download verifier ${exportFormat.toUpperCase()} package`);
    }
  };

  const getReportTypeLabel = (type: ReportType) => {
    return reportTypes.find(r => r.value === type)?.label || type;
  };

  const getReportTypeIcon = (type: ReportType) => {
    return reportTypes.find(r => r.value === type)?.icon || <FileText className="h-4 w-4" />;
  };

  const getReportModeLabel = (mode?: ReportMode) => {
    return getReportModeProfile(mode).label;
  };

  const pageStart = totalReports === 0 ? 0 : (page - 1) * REPORTS_PAGE_SIZE + 1;
  const pageEnd = Math.min(page * REPORTS_PAGE_SIZE, totalReports);
  const emptyTabLabel =
    activeTab === 'all'
      ? isAdmin
        ? 'Generate your first sustainability report'
        : 'Reports created by admins will appear here'
      : `No ${activeTab} reports`;

  return (
    <div className="space-y-6">
      <DashboardHeroCard
        title="Reports"
        description={
          isAdmin
            ? selectedFacility
              ? `Generate and manage sustainability compliance reports for ${selectedFacility.name}`
              : 'Generate and manage sustainability compliance reports'
            : 'Review published and draft reports. Generation and publishing stay restricted to admins.'
        }
        icon={<FileBarChart className="h-8 w-8" />}
        gradientClassName="bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-500"
        eyebrow="Compliance Reporting"
        eyebrowIcon={<FileBarChart className="h-3.5 w-3.5" />}
        aside={
          isAdmin ? (
            <>
              <DashboardHeroActionButton
                tone="secondary"
                className="gap-2"
                disabled={isGenerating}
                onClick={async () => {
                  toast.info('Generating a quick gap review draft...');
                  try {
                    await requestReportGeneration(
                      {
                        reportType: 'gap_analysis',
                        reportMode: reportDefaults.defaultReportMode || 'internal_management',
                        reportingPeriod: new Date().toISOString().slice(0, 7),
                      },
                      { openOnReuse: true }
                    );
                  } catch (error) {
                    console.error('Error generating quick gap review:', error);
                    toast.error('Failed to generate a quick gap review draft');
                  }
                }}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Quick Gap Review
              </DashboardHeroActionButton>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <DashboardHeroActionButton tone="primary" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Generate Report
                  </DashboardHeroActionButton>
                </DialogTrigger>
                <DashboardDialogContentShell size="lg">
                      <DashboardDialogIntro
                        badge="Report setup"
                        title="Generate New Report"
                        description={
                          selectedFacility
                            ? `Generate a compliance report scoped to ${selectedFacility.name} (${selectedFacility.code}).`
                            : 'Select the report type and reporting period to generate a compliance report'
                        }
                      />
                      <DashboardDialogBody className="grid gap-4">
                        {selectedFacility && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700/75">
                                  Facility report banner
                                </p>
                                <div>
                                  <p className="text-sm font-semibold text-slate-950">
                                    {selectedFacility.name}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {selectedFacility.code}
                                    {selectedFacility.country ? ` • ${selectedFacility.country}` : ''}
                                  </p>
                                </div>
                                {selectedFacility.address && (
                                  <div className="flex items-start gap-2 text-sm text-slate-600">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                                    <span>{selectedFacility.address}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="reportType">Report Type</Label>
                          <Select
                            value={formData.reportType}
                            onValueChange={(value: ReportType) => setFormData(prev => ({ ...prev, reportType: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select report type" />
                            </SelectTrigger>
                            <SelectContent>
                              {reportTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    {type.icon}
                                    <div>
                                      <p className="font-medium">{type.label}</p>
                                      <p className="text-xs text-muted-foreground">{type.description}</p>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="period">Reporting Period</Label>
                          <Input
                            id="period"
                            type="month"
                            value={formData.reportingPeriod}
                            onChange={e => setFormData(prev => ({ ...prev, reportingPeriod: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            For quarterly reports, select any month in the quarter
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reportMode">Report Mode</Label>
                          <Select
                            value={formData.reportMode}
                            onValueChange={(value: ReportMode) =>
                              setFormData((prev) => ({ ...prev, reportMode: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select report mode" />
                            </SelectTrigger>
                            <SelectContent>
                              {reportModes.map((mode) => (
                                <SelectItem key={mode.value} value={mode.value}>
                                  <div>
                                    <p className="font-medium">{mode.label}</p>
                                    <p className="text-xs text-muted-foreground">{mode.description}</p>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        {getReportModeProfile(formData.reportMode).usesLockedMethodologyTemplate && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                              {getReportModeProfile(formData.reportMode).lockedMethodologySummary}
                            </div>
                          )}
                        </div>
                      </DashboardDialogBody>
                      <DialogFooter className="border-t border-emerald-100 px-6 pt-5 pb-6 sm:px-7 sm:pb-7">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleGenerate} disabled={isGenerating}>
                          {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Generate
                        </Button>
                      </DialogFooter>
                </DashboardDialogContentShell>
              </Dialog>
            </>
          ) : (
            <Badge
              variant="secondary"
              className="border border-white/30 bg-white/15 px-3 py-2 text-white"
            >
              Read-only access
            </Badge>
          )
        }
      />

      {loadError ? (
        <Card className="border-red-200 bg-red-50/80">
          <CardContent className="flex items-start gap-3 pt-6 text-sm text-red-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
            <div>
              <p className="font-medium">Reports data is unavailable right now.</p>
              <p className="mt-1 text-red-900/80">{loadError}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Approval Queue</CardTitle>
            <CardDescription>
              Draft reports waiting on review before publication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovalReports.length > 0 ? (
              pendingApprovalReports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{report.title}</p>
                      <Badge variant="outline">{getReportModeLabel(report.reportMode)}</Badge>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Pending review
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {report.reportRecipients || 'No default recipients'} • Created{' '}
                      {format(new Date(report.createdAt), 'MMM d, yyyy')}
                    </p>
                    {report.approvalWorkflow && (
                      <p className="mt-1 text-xs text-muted-foreground">{report.approvalWorkflow}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedReport(report)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Review
                    </Button>
                    <Button
                      onClick={() => {
                        void handlePublish(report.id);
                      }}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Approve & Publish
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No reports are waiting on approval right now.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Reports',
            value: summaryCounts.total,
            icon: FileBarChart,
            cardClassName: 'border-slate-200',
            valueClassName: 'text-slate-950',
            iconClassName: 'text-slate-400',
          },
          {
            label: 'Published',
            value: summaryCounts.published,
            icon: CheckCircle2,
            cardClassName: 'border-green-200',
            valueClassName: 'text-green-600',
            iconClassName: 'text-green-500',
          },
          {
            label: 'Drafts',
            value: summaryCounts.draft,
            icon: Clock,
            cardClassName: 'border-yellow-200',
            valueClassName: 'text-yellow-600',
            iconClassName: 'text-yellow-500',
          },
          {
            label: 'This Month',
            value: summaryCounts.thisMonth,
            icon: TrendingDown,
            cardClassName: 'border-blue-200',
            valueClassName: 'text-blue-600',
            iconClassName: 'text-blue-500',
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.label}
              className={`border shadow-sm ${item.cardClassName}`}
            >
              <CardContent className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className={`text-2xl font-bold ${item.valueClassName}`}>{item.value}</p>
                  </div>
                  <Icon className={`h-6 w-6 ${item.iconClassName}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reports Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as ReportTabValue);
          setPage(1);
        }}
        className="space-y-6"
      >
        <TabsList className="bg-white dark:bg-gray-800 shadow-sm border p-1">
          <TabsTrigger value="all">All Reports</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        {['all', 'published', 'drafts', 'archived'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <Card className="border-emerald-100/80 shadow-sm">
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="animate-pulse border border-slate-200 shadow-sm">
                        <CardContent className="space-y-3 px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-lg bg-muted" />
                              <div className="space-y-2">
                                <div className="h-5 w-28 rounded bg-muted" />
                                <div className="h-4 w-36 rounded bg-muted" />
                              </div>
                            </div>
                            <div className="h-6 w-20 rounded-full bg-muted" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="h-14 rounded-lg bg-muted" />
                            <div className="h-14 rounded-lg bg-muted" />
                            <div className="h-14 rounded-lg bg-muted" />
                            <div className="h-14 rounded-lg bg-muted" />
                          </div>
                          <div className="h-8 rounded-md bg-muted" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : reports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileBarChart className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium">No reports found</p>
                    <p className="text-muted-foreground">{emptyTabLabel}</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-1">
                    <div className="grid gap-3 pr-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {reports.map((report) => {
                        const status = statusConfig[report.status];
                        const reportTone =
                          report.status === 'published'
                            ? {
                                cardBorder: 'border-green-200/80',
                                iconBg: 'bg-green-50 text-green-600',
                              }
                            : report.status === 'draft'
                              ? {
                                  cardBorder: 'border-yellow-200/80',
                                  iconBg: 'bg-yellow-50 text-yellow-600',
                                }
                              : {
                                  cardBorder: 'border-slate-200',
                                  iconBg: 'bg-slate-100 text-slate-600',
                                };

                        return (
                          <Card
                            key={report.id}
                            className={`cursor-pointer border shadow-sm ${reportTone.cardBorder}`}
                            onClick={() => setSelectedReport(report)}
                          >
                            <CardContent className="space-y-3 px-4 py-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className={`rounded-lg p-2 ${reportTone.iconBg}`}>
                                    {getReportTypeIcon(report.reportType)}
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="truncate text-base font-semibold leading-snug">
                                      {report.title}
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {getReportTypeLabel(report.reportType)}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline" className={`${status.color} text-[11px]`}>
                                  <status.icon className="mr-1 h-3 w-3" />
                                  {status.label}
                                </Badge>
                              </div>

                              <p className="line-clamp-2 text-sm text-muted-foreground">
                                {report.summary}
                              </p>

                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="rounded-lg bg-muted px-3 py-2.5">
                                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                      Total
                                    </p>
                                    <p className="font-medium">{formatCompactCo2e(report.totalEmissions)}</p>
                                  </div>
                                  <div className="rounded-lg bg-muted px-3 py-2.5">
                                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                      Period
                                    </p>
                                    <p className="font-medium">{report.reportingPeriod}</p>
                                  </div>
                                  <div className="rounded-lg bg-muted px-3 py-2.5">
                                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                      Type
                                    </p>
                                    <p className="font-medium">{getReportTypeLabel(report.reportType)}</p>
                                  </div>
                                  <div className="rounded-lg bg-muted px-3 py-2.5">
                                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                      Created
                                    </p>
                                    <p className="font-medium">{format(new Date(report.createdAt), 'MMM d, yyyy')}</p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <Badge variant="outline">{getReportModeLabel(report.reportMode)}</Badge>
                                  <span>
                                    {report.boundaryMetadata?.includedDepartments.length === 1
                                      ? report.boundaryMetadata.includedDepartments[0].code ||
                                        report.boundaryMetadata.includedDepartments[0].name
                                      : 'Company-wide'}
                                  </span>
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 flex-1 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedReport(report);
                                    }}
                                  >
                                    <Eye className="mr-1 h-3 w-3" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 flex-1 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(report);
                                    }}
                                  >
                                    <Download className="mr-1 h-3 w-3" />
                                    Export
                                  </Button>
                                  {isAdmin && report.status === 'draft' ? (
                                    <Button
                                      size="sm"
                                      className="h-8 flex-1 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePublish(report.id);
                                      }}
                                    >
                                      <Share2 className="mr-1 h-3 w-3" />
                                      Publish
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          <PaginationFooter
            summary={`Showing ${pageStart}-${pageEnd} of ${totalReports} reports • ${REPORTS_PAGE_SIZE} per page`}
            page={page}
            totalPages={totalPages}
            isLoading={isLoading}
            previousDisabled={page <= 1}
            nextDisabled={page >= totalPages}
            onPrevious={() => setPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          />
        </CardContent>
      </Card>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DashboardDialogContentShell size="xl" className="max-h-[88vh] overflow-hidden">
          <DashboardDialogIntro
            badge="Report detail"
            title={
              <span className="flex items-center gap-2">
                {selectedReport && getReportTypeIcon(selectedReport.reportType)}
                {selectedReport?.title}
              </span>
            }
            description={
              selectedReport
                ? `Generated on ${format(new Date(selectedReport.createdAt), 'MMMM d, yyyy h:mm a')}`
                : undefined
            }
          />
          {selectedReport && (
            <ScrollArea className="max-h-[calc(88vh-170px)]">
              <DashboardDialogBody className="space-y-4 pr-4">
                {isSelectedReportLoading && (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refreshing report details and factor provenance...
                  </div>
                )}

                {selectedReport.boundaryMetadata?.includedDepartments.length === 1 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700/75">
                          Facility report banner
                        </p>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {selectedReport.boundaryMetadata.includedDepartments[0].name}
                          </p>
                          <p className="text-sm text-slate-600">
                            {selectedReport.boundaryMetadata.includedDepartments[0].code || 'Code not set'}
                            {selectedReport.boundaryMetadata.includedDepartments[0].country
                              ? ` • ${selectedReport.boundaryMetadata.includedDepartments[0].country}`
                              : ''}
                          </p>
                        </div>
                        {selectedReport.boundaryMetadata.includedDepartments[0].address && (
                          <div className="flex items-start gap-2 text-sm text-slate-600">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                            <span>{selectedReport.boundaryMetadata.includedDepartments[0].address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Status and Period */}
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className={statusConfig[selectedReport.status].color}>
                    {statusConfig[selectedReport.status].label}
                  </Badge>
                  <Badge variant="outline">
                    {getReportTypeLabel(selectedReport.reportType)}
                  </Badge>
                  <Badge variant="outline">
                    {selectedReport.reportingPeriod}
                  </Badge>
                  <Badge variant="outline">
                    {getReportModeLabel(selectedReport.reportMode)}
                  </Badge>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-medium mb-2">Executive Summary</h4>
                  <p className="text-sm text-muted-foreground">{selectedReport.summary}</p>
                </div>

                <div className="rounded-lg border bg-background p-3">
                  <p className="text-sm font-medium">Audience Mode</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getReportModeProfile(selectedReport.reportMode).description}
                  </p>
                  {getReportModeProfile(selectedReport.reportMode).usesLockedMethodologyTemplate &&
                    getReportModeProfile(selectedReport.reportMode).lockedMethodologySummary && (
                    <p className="mt-2 text-xs text-emerald-700">
                      {getReportModeProfile(selectedReport.reportMode).lockedMethodologySummary}
                    </p>
                  )}
                </div>

                {getReportModeProfile(selectedReport.reportMode).showBoundary && selectedReport.boundaryMetadata && (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <div>
                      <h4 className="font-medium">Reporting Boundary</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedReport.boundaryMetadata.boundarySummary}
                      </p>
                    </div>

                    {selectedReport.boundaryMetadata.includedDepartments.length > 0 && (
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Included Facilities / Sites</p>
                        <div className="mt-2 space-y-2">
                          {selectedReport.boundaryMetadata.includedDepartments.map((department) => (
                            <div
                              key={`${department.code || 'dept'}-${department.name}`}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-muted-foreground">{department.name}</span>
                              <span className="font-medium">{department.code || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border bg-background p-3">
                      <p className="text-sm font-medium">Exclusions</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedReport.boundaryMetadata.exclusions}
                      </p>
                    </div>
                  </div>
                )}

                {getReportModeProfile(selectedReport.reportMode).showMethodology && selectedReport.methodologyMetadata && (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <div>
                      <h4 className="font-medium">Methodology</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Reporting basis, factor policy, and owner context for this report.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Reporting Standard</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedReport.methodologyMetadata.reportingStandard}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">GWP Basis</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedReport.methodologyMetadata.gwpBasis}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Factor Source Policy</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedReport.methodologyMetadata.factorSourcePolicy}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Override Policy</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedReport.methodologyMetadata.overridePolicy}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-background p-3">
                      <p className="text-sm font-medium">Methodology Notes</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedReport.methodologyMetadata.methodologyNotes}
                      </p>
                    </div>

                    {(selectedReport.methodologyMetadata.reportOwnerName ||
                      selectedReport.methodologyMetadata.reportOwnerEmail) && (
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Report Owner</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedReport.methodologyMetadata.reportOwnerName || 'Unassigned'}
                          {selectedReport.methodologyMetadata.reportOwnerEmail
                            ? ` (${selectedReport.methodologyMetadata.reportOwnerEmail})`
                            : ''}
                        </p>
                      </div>
                    )}

                    {selectedReport.methodologyMetadata.reportRecipients &&
                      selectedReport.methodologyMetadata.reportRecipients.length > 0 && (
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Default Recipients</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedReport.methodologyMetadata.reportRecipients.join(', ')}
                        </p>
                      </div>
                    )}

                    {selectedReport.methodologyMetadata.approvalWorkflow && (
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Approval Workflow</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedReport.methodologyMetadata.approvalWorkflow}
                        </p>
                      </div>
                    )}

                    {selectedReport.methodologyMetadata.approvalStatus && (
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Approval Status</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedReport.methodologyMetadata.approvalStatus}
                          {selectedReport.methodologyMetadata.approvedByName
                            ? ` by ${selectedReport.methodologyMetadata.approvedByName}`
                            : ''}
                          {selectedReport.methodologyMetadata.approvedAt
                            ? ` on ${format(new Date(selectedReport.methodologyMetadata.approvedAt), 'MMMM d, yyyy h:mm a')}`
                            : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Emissions Data */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Emissions</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCo2e(selectedReport.totalEmissions)}
                      </p>
                    </CardContent>
                  </Card>
                  {selectedReport.previousPeriodEmissions && (
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Previous Period</p>
                        <p className="text-2xl font-bold">
                          {formatCo2e(selectedReport.previousPeriodEmissions)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(() => {
                            const change = ((selectedReport.previousPeriodEmissions - selectedReport.totalEmissions) / selectedReport.previousPeriodEmissions) * 100;
                            return change > 0 
                              ? <span className="text-green-600">↓ {change.toFixed(1)}% decrease</span>
                              : <span className="text-red-600">↑ {Math.abs(change).toFixed(1)}% increase</span>;
                          })()}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {getReportModeProfile(selectedReport.reportMode).showOperationalBreakdown && selectedReport.reportAnalytics && (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <div>
                      <h4 className="font-medium">Operational Breakdown</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Entry coverage, verification readiness, emissions concentration, and recent trend movement for this reporting period.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Entries</p>
                          <p className="text-2xl font-bold text-slate-900">
                            {selectedReport.reportAnalytics.quality.totalEntries}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Verified</p>
                          <p className="text-2xl font-bold text-emerald-600">
                            {selectedReport.reportAnalytics.quality.verificationRate.toFixed(1)}%
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Evidence</p>
                          <p className="text-2xl font-bold text-sky-600">
                            {selectedReport.reportAnalytics.quality.evidenceCoverageRate.toFixed(1)}%
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Overrides</p>
                          <p className="text-2xl font-bold text-amber-600">
                            {selectedReport.reportAnalytics.quality.overriddenEntries}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {selectedReport.reportAnalytics.intensityMetrics.length > 0 && (
                      <div className="space-y-2 rounded-lg border bg-background p-3">
                        <div>
                          <p className="text-sm font-medium">Intensity Metrics</p>
                          <p className="text-xs text-muted-foreground">
                            These metrics are shown only when denominator data is configured for the reporting entity or included facilities.
                          </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {selectedReport.reportAnalytics.intensityMetrics.map((metric) => (
                            <div
                              key={metric.label}
                              className="rounded-lg border bg-muted/20 p-3"
                            >
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                {metric.label}
                              </p>
                              <p className="mt-2 text-xl font-semibold text-slate-900">
                                {metric.value.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">{metric.unit}</p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {metric.basis}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-3 lg:grid-cols-2">
                      {selectedReport.reportAnalytics.breakdownByScope.length > 0 && (
                        <div className="rounded-lg border bg-background p-3">
                          <div className="mb-3">
                            <p className="text-sm font-medium">Scope Contribution</p>
                            <p className="text-xs text-muted-foreground">
                              Share of report emissions by GHG scope.
                            </p>
                          </div>
                          <div className="space-y-3">
                            {selectedReport.reportAnalytics.breakdownByScope.map((item) => (
                              <ContributionBar
                                key={item.label}
                                label={item.label}
                                meta={`${item.entries} entries`}
                                valueLabel={formatCo2e(item.emissions)}
                                percent={item.percent}
                                accentClassName="bg-emerald-500"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedReport.reportAnalytics.breakdownBySourceType.length > 0 && (
                        <div className="rounded-lg border bg-background p-3">
                          <div className="mb-3">
                            <p className="text-sm font-medium">Source Contribution</p>
                            <p className="text-xs text-muted-foreground">
                              Highest-emitting source types for this reporting period.
                            </p>
                          </div>
                          <div className="space-y-3">
                            {selectedReport.reportAnalytics.breakdownBySourceType.slice(0, 5).map((item) => (
                              <ContributionBar
                                key={item.label}
                                label={item.label}
                                meta={`${item.percent.toFixed(1)}% of emissions`}
                                valueLabel={formatCo2e(item.emissions)}
                                percent={item.percent}
                                accentClassName="bg-sky-500"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                      {selectedReport.reportAnalytics.topDepartments.length > 0 && (
                        <div className="rounded-lg border bg-background p-3">
                          <div className="mb-3">
                            <p className="text-sm font-medium">Facility Leaderboard</p>
                            <p className="text-xs text-muted-foreground">
                              Ranked facilities and sites by emissions contribution, with verification and override context.
                            </p>
                          </div>
                          <div className="space-y-3">
                            {selectedReport.reportAnalytics.topDepartments.map((item) => (
                              <DepartmentLeaderboardRow
                                key={`${item.departmentCode || 'dept'}-${item.departmentName}`}
                                item={item}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedReport.reportAnalytics.monthlyTrend.length > 0 && (
                        <div className="rounded-lg border bg-background p-3">
                          <div className="mb-3">
                            <p className="text-sm font-medium">Monthly Trend</p>
                            <p className="text-xs text-muted-foreground">
                              Rolling activity trend leading into the current report window.
                            </p>
                          </div>
                          <div
                            className="grid h-48 items-end gap-2"
                            style={{
                              gridTemplateColumns: `repeat(${selectedReport.reportAnalytics?.monthlyTrend.length ?? 0}, minmax(0, 1fr))`,
                            }}
                          >
                            {(selectedReport.reportAnalytics?.monthlyTrend ?? []).map((point) => (
                              <TrendBar
                                key={point.period}
                                point={point}
                                maxEmissions={Math.max(
                                  ...(selectedReport.reportAnalytics?.monthlyTrend ?? []).map(
                                    (trendPoint) => trendPoint.emissions
                                  ),
                                  1
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Gaps Identified */}
                {selectedReport.gapsIdentified &&
                  parseStoredGapItems(selectedReport.gapsIdentified).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Gaps Identified</h4>
                    <div className="grid gap-3">
                      {parseStoredGapItems(selectedReport.gapsIdentified).map((gap, index) => (
                        <div
                          key={`${gap.kind}-${index}`}
                          className="rounded-lg border border-orange-200 bg-orange-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{getReportGapTitle(gap)}</p>
                              <p className="text-sm text-muted-foreground">{getReportGapMeta(gap)}</p>
                            </div>
                            <Badge variant="outline" className={getReportGapBadgeClassName(gap)}>
                              {getReportGapBadgeLabel(gap)}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm text-slate-700">{gap.summary}</p>
                          {gap.kind === 'goal' && (
                            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-orange-200 pt-3 text-sm">
                              <span className="text-muted-foreground">
                                Current:{' '}
                                <span className="font-medium text-slate-900">
                                  {formatGapValue(gap.currentValue, gap.currentUnit)}
                                </span>
                              </span>
                              <span className="text-muted-foreground">
                                Target:{' '}
                                <span className="font-medium text-slate-900">
                                  {formatGapValue(gap.targetValue, gap.targetUnit)}
                                </span>
                              </span>
                              <span className="text-muted-foreground">
                                Gap:{' '}
                                <span className="font-medium text-slate-900">
                                  {formatGapValue(gap.gapValue, gap.gapUnit)}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {getReportModeProfile(selectedReport.reportMode).showRecommendations &&
                  selectedReport.recommendations && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-600" />
                      Operational Insights
                    </h4>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm">{selectedReport.recommendations}</p>
                    </div>
                  </div>
                )}

                {/* Factor Provenance */}
                {getReportModeProfile(selectedReport.reportMode).showFactorProvenance &&
                  selectedReport.factorProvenance && (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          Factor Provenance
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedReport.factorProvenance.summaryText}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Official</p>
                          <p className="text-2xl font-bold text-emerald-600">
                            {selectedReport.factorProvenance.officialEntries}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Supplemental</p>
                          <p className="text-2xl font-bold text-sky-600">
                            {selectedReport.factorProvenance.supplementalEntries}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Overrides</p>
                          <p className="text-2xl font-bold text-amber-600">
                            {selectedReport.factorProvenance.overriddenEntries}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Unknown</p>
                          <p className="text-2xl font-bold text-slate-600">
                            {selectedReport.factorProvenance.unknownEntries}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {selectedReport.factorProvenance.methodologyList.length > 0 && (
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Methodologies Used</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedReport.factorProvenance.methodologyList.join(', ')}
                        </p>
                      </div>
                    )}

                    {selectedReport.factorProvenance.sourceBreakdown.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Source Breakdown</p>
                        <div className="space-y-2">
                          {selectedReport.factorProvenance.sourceBreakdown.map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
                            >
                              <div>
                                <p className="font-medium">{item.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.entries} entr{item.entries === 1 ? 'y' : 'ies'}
                                </p>
                              </div>
                              <p className="text-sm font-medium">
                                {formatCo2e(item.emissions)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {getReportModeProfile(selectedReport.reportMode).showAppendices &&
                  selectedReport.appendices && (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <div>
                      <h4 className="font-medium">Assurance Appendices</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Evidence, factor registers, override history, and unresolved quality items carried with this report package.
                      </p>
                    </div>

                    {selectedReport.verifierManifest && (
                      <div className="rounded-lg border bg-background p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">Verifier Manifest</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {selectedReport.verifierManifest.evidenceRowCount} evidence rows ·{' '}
                              {selectedReport.verifierManifest.factorRegisterCount} factor records ·{' '}
                              {selectedReport.verifierManifest.overrideCount} overrides
                            </p>
                          </div>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {selectedReport.verifierManifest.checksum.slice(0, 16)}...
                          </Badge>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Unresolved Quality Issues</p>
                        {selectedReport.appendices.unresolvedQualityIssues.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {selectedReport.appendices.unresolvedQualityIssues.map((issue) => (
                              <div
                                key={issue.id}
                                className="rounded-lg border bg-muted/20 px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-medium">{issue.title}</p>
                                  <Badge variant="outline" className="uppercase">
                                    {issue.severity}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {issue.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">
                            No unresolved quality issues were identified in this package.
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Factor Register</p>
                        <div className="mt-2 space-y-2">
                          {selectedReport.appendices.factorRegister.slice(0, 5).map((item) => (
                            <div
                              key={item.key}
                              className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2"
                            >
                              <div>
                                <p className="font-medium">{item.sourceLabel}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.sourceFamily || 'Unknown'} · {item.methodology || 'Unspecified'}
                                </p>
                              </div>
                              <p className="text-sm font-medium">
                                {formatCo2e(item.emissions)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Override Register</p>
                        {selectedReport.appendices.overrideRegister.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {selectedReport.appendices.overrideRegister.slice(0, 5).map((item) => (
                              <div
                                key={`${item.entryId}-${item.overrideAt || item.transactionDate}`}
                                className="rounded-lg border bg-muted/20 px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-medium">{item.entryId}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(item.transactionDate), 'MMM d, yyyy')}
                                  </p>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {item.overrideReason}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.overrideBy || 'Unknown'} · {item.factorValue.toFixed(3)} {item.factorUnit}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">
                            No custom factor overrides were used in this report.
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-sm font-medium">Evidence Register</p>
                        <div className="mt-2 space-y-2">
                          {selectedReport.appendices.evidenceRegister.slice(0, 5).map((item) => (
                            <div
                              key={item.entryId}
                              className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2"
                            >
                              <div>
                                <p className="font-medium">{item.entryId}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.sourceDocument || 'Missing source document'}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {item.verified ? 'Verified' : 'Pending'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notion Sync Status */}
                {selectedReport.notionPageId && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Synced to Notion on {format(new Date(selectedReport.notionSyncedAt!), 'MMMM d, yyyy')}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {onOpenAuditCenter && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        onOpenAuditCenter(
                          {
                            feature: 'reports',
                            entityType: 'report',
                            entityId: selectedReport.id,
                          },
                          selectedReport.title
                        );
                        setSelectedReport(null);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Open in Audit Center
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleVerifierExport(selectedReport, 'csv')}
                  >
                    <Download className="h-4 w-4" />
                    Verifier CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleVerifierExport(selectedReport, 'json')}
                  >
                    <Download className="h-4 w-4" />
                    Verifier JSON
                  </Button>
                  <Button className="flex-1 gap-2" onClick={() => handleDownload(selectedReport)}>
                    <Download className="h-4 w-4" />
                    Download Report
                  </Button>
                  {isAdmin && selectedReport.status === 'draft' && (
                    <Button className="flex-1 gap-2" onClick={() => {
                      handlePublish(selectedReport.id);
                      setSelectedReport(null);
                    }}>
                      <Share2 className="h-4 w-4" />
                      Publish
                    </Button>
                  )}
                </div>
              </DashboardDialogBody>
            </ScrollArea>
          )}
        </DashboardDialogContentShell>
      </Dialog>
    </div>
  );
}

function ContributionBar({
  label,
  meta,
  valueLabel,
  percent,
  accentClassName,
}: {
  label: string;
  meta: string;
  valueLabel: string;
  percent: number;
  accentClassName: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{meta}</p>
        </div>
        <p className="shrink-0 text-xs font-medium text-slate-700">{valueLabel}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${accentClassName}`}
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
    </div>
  );
}

function DepartmentLeaderboardRow({ item }: { item: ReportDepartmentAnalytics }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {item.departmentName}
            {item.departmentCode ? ` (${item.departmentCode})` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.entries} entries · {item.verifiedEntries} verified · {item.overriddenEntries} overrides
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-slate-800">
          {formatCo2e(item.emissions)}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-500"
          style={{ width: `${Math.max(item.percent, 4)}%` }}
        />
      </div>
    </div>
  );
}

function TrendBar({
  point,
  maxEmissions,
}: {
  point: ReportTrendPoint;
  maxEmissions: number;
}) {
  const heightPercent = maxEmissions > 0 ? (point.emissions / maxEmissions) * 100 : 0;

  return (
    <div className="flex min-w-0 flex-col items-center justify-end gap-2">
      <p className="text-[10px] font-medium text-slate-700">
        {formatCompactCo2e(point.emissions)}
      </p>
      <div className="flex h-32 w-full items-end rounded-t-xl bg-slate-50 px-1">
        <div
          className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-300 transition-all"
          style={{ height: `${Math.max(heightPercent, 8)}%` }}
        />
      </div>
      <div className="text-center">
        <p className="text-[10px] font-medium text-slate-700">{point.label}</p>
        <p className="text-[10px] text-muted-foreground">{point.entryCount} entries</p>
      </div>
    </div>
  );
}

function getReportGapTitle(gap: StoredGapItem) {
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

function getReportGapMeta(gap: StoredGapItem) {
  switch (gap.kind) {
    case 'goal':
      return `${gap.department} • ${gap.progress.toFixed(1)}% progress`;
    case 'issue':
      return gap.facility;
    case 'area':
      return gap.gapValue !== undefined
        ? formatGapValue(gap.gapValue, gap.gapUnit || 'units')
        : 'Cross-functional gap';
    default:
      return '';
  }
}

function getReportGapBadgeLabel(gap: StoredGapItem) {
  if (gap.kind === 'goal') {
    return gap.status === 'at_risk' ? 'At Risk' : 'On Track';
  }

  return gap.severity.charAt(0).toUpperCase() + gap.severity.slice(1);
}

function getReportGapBadgeClassName(gap: StoredGapItem) {
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

function getStatusForTab(tab: ReportTabValue): ReportStatus | null {
  switch (tab) {
    case 'published':
      return 'published';
    case 'drafts':
      return 'draft';
    case 'archived':
      return 'archived';
    default:
      return null;
  }
}

function getDownloadFilename(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() || null;
}
