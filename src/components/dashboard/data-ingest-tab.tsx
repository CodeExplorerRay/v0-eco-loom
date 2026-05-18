'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { DashboardHeroCard } from '@/components/dashboard/dashboard-hero-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getEmissionFactor, getEmissionFactorsBySourceType } from '@/lib/emissions/factor-service';
import type {
  Department,
  ProcessingQueueItem,
  SessionInfo,
  SourceType,
} from '@/lib/types';
import { formatCo2e } from '@/lib/utils';
import { toast } from 'sonner';

interface DataIngestTabProps {
  companyId: string;
  session: SessionInfo | null;
  selectedFacilityId?: string | null;
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function DataIngestTab({
  companyId,
  session,
  selectedFacilityId,
}: DataIngestTabProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [processingQueue, setProcessingQueue] = useState<ProcessingQueueItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingJobs, setIsRefreshingJobs] = useState(false);
  const [manualForm, setManualForm] = useState({
    sourceType: 'electricity' as SourceType,
    activityValue: '',
    activityUnit: '',
    department: '',
    transactionDate: new Date().toISOString().split('T')[0],
    description: '',
    sourceDocument: '',
  });
  const [manualFactorOverrideEnabled, setManualFactorOverrideEnabled] = useState(false);
  const [manualFactorOverride, setManualFactorOverride] = useState({
    emissionFactor: '',
    reason: '',
    source: '',
  });
  const [uploadFacilityId, setUploadFacilityId] = useState('');
  const [csvFacilityId, setCsvFacilityId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = session?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'csv'>(
    isAdmin ? 'upload' : 'manual'
  );

  useEffect(() => {
    setActiveTab(isAdmin ? 'upload' : 'manual');
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setManualFactorOverrideEnabled(false);
      setManualFactorOverride({ emissionFactor: '', reason: '', source: '' });
    }
  }, [isAdmin]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`/api/departments?companyId=${companyId}`);
        if (!response.ok) {
          throw new Error('Failed to load facilities.');
        }

        const data = await response.json();
        setDepartments(data);
      } catch (error) {
        console.error('Error fetching departments:', error);
        toast.error('Failed to load facility list.');
      }
    };

    fetchDepartments();
  }, [companyId]);

  useEffect(() => {
    if (!selectedFacilityId) {
      return;
    }

    setManualForm((prev) =>
      prev.department === selectedFacilityId ? prev : { ...prev, department: selectedFacilityId }
    );
    setUploadFacilityId(selectedFacilityId);
    setCsvFacilityId(selectedFacilityId);
  }, [selectedFacilityId]);

  const fetchProcessingQueue = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    try {
      setIsRefreshingJobs(true);
      const params = new URLSearchParams({ companyId, limit: '12' });
      if (selectedFacilityId) {
        params.set('departmentId', selectedFacilityId);
      }

      const response = await fetch(`/api/upload?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load ingest activity.');
      }

      const data = await response.json();
      setProcessingQueue(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching ingest jobs:', error);
      toast.error('Failed to load recent ingest activity.');
    } finally {
      setIsRefreshingJobs(false);
    }
  }, [companyId, isAdmin, selectedFacilityId]);

  useEffect(() => {
    fetchProcessingQueue();
  }, [fetchProcessingQueue]);

  const handleIngestUpload = useCallback(
    async (
      files: FileList | null,
      mode: 'evidence_upload' | 'csv_import',
      facilityId?: string
    ) => {
      if (!files || files.length === 0) {
        return;
      }

      setIsSubmitting(true);

      try {
        const uploadedJobs: ProcessingQueueItem[] = [];

        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('companyId', companyId);
          formData.append('mode', mode);
          if (facilityId) {
            formData.append('departmentId', facilityId);
          }

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const payload = await response.json().catch(() => ({ error: 'Upload failed.' }));
          if (!response.ok) {
            throw new Error(payload.error || 'Upload failed.');
          }

          if (payload.job) {
            uploadedJobs.push(payload.job);
          }

          toast.success(
            payload.message ||
              (mode === 'csv_import'
                ? `Imported ${file.name} successfully.`
                : `Stored ${file.name} successfully.`)
          );
        }

        setProcessingQueue((prev) => {
          const next = [...uploadedJobs, ...prev];
          const deduped = new Map(next.map((item) => [item.id, item]));
          return Array.from(deduped.values());
        });
        await fetchProcessingQueue();
      } catch (error) {
        console.error('Error handling ingest upload:', error);
        toast.error(error instanceof Error ? error.message : 'Upload failed.');
        await fetchProcessingQueue();
      } finally {
        setIsSubmitting(false);
        if (mode === 'evidence_upload' && fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        if (mode === 'csv_import' && csvInputRef.current) {
          csvInputRef.current.value = '';
        }
      }
    },
    [companyId, fetchProcessingQueue]
  );

  const handleManualSubmit = async () => {
    const targetDepartmentId = selectedFacilityId || manualForm.department;

    if (!manualForm.activityValue || !manualForm.activityUnit || !targetDepartmentId) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const factor = getEmissionFactor(manualForm.sourceType, manualForm.activityUnit);
    if (!factor) {
      toast.error('Invalid unit selected.');
      return;
    }

    let factorOverride;
    if (manualFactorOverrideEnabled) {
      if (!isAdmin) {
        toast.error('Only admins can apply custom factor overrides.');
        return;
      }

      const parsedOverrideFactor = Number.parseFloat(manualFactorOverride.emissionFactor);
      if (!Number.isFinite(parsedOverrideFactor) || parsedOverrideFactor <= 0) {
        toast.error('Enter a valid positive override factor.');
        return;
      }

      if (!manualFactorOverride.reason.trim()) {
        toast.error('Provide a reason for the factor override.');
        return;
      }

      factorOverride = {
        emissionFactor: parsedOverrideFactor,
        reason: manualFactorOverride.reason.trim(),
        source: manualFactorOverride.source.trim() || undefined,
      };
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: manualForm.sourceType,
          activityValue: Number.parseFloat(manualForm.activityValue),
          activityUnit: manualForm.activityUnit,
          transactionDate: manualForm.transactionDate,
          reportingPeriod: manualForm.transactionDate.slice(0, 7),
          departmentId: targetDepartmentId,
          companyId,
          sourceDocument: manualForm.sourceDocument || 'Manual Entry',
          notes: manualForm.description,
          factorOverride,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Failed to create ledger entry.' }));
        throw new Error(payload.error || 'Failed to create ledger entry.');
      }

      const createdEntry = await response.json();
      toast.success(`Added ${formatCo2e(createdEntry.co2Equivalent)} to the carbon ledger.`);
      if (createdEntry.notionSync?.status === 'failed') {
        toast.error(createdEntry.notionSync.reason || 'The entry saved, but Notion auto-sync failed.');
      } else if (createdEntry.notionSync?.status === 'skipped') {
        toast.info(createdEntry.notionSync.reason || 'The entry saved locally, but Notion auto-sync is unavailable right now.');
      }

      setManualForm({
        sourceType: 'electricity',
        activityValue: '',
        activityUnit: '',
        department: selectedFacilityId || '',
        transactionDate: new Date().toISOString().split('T')[0],
        description: '',
        sourceDocument: '',
      });
      setManualFactorOverrideEnabled(false);
      setManualFactorOverride({ emissionFactor: '', reason: '', source: '' });
    } catch (error) {
      console.error('Error adding manual entry:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadCsvTemplate = () => {
  const template = `source_type,activity_value,activity_unit,facility_code,transaction_date,source_document,notes,factor_region,factor_year
electricity,18144,kWh,US-CMC,2026-03-18,cascadia-grid-load-march.pdf,Cascadia grid load,US,2026
travel,940,km (flight),SG-SES,2026-03-07,singapore-regional-workshops.csv,Regional workshop travel,,
shipping,12480,tonne-km,NL-RFH,2026-03-14,rotterdam-freight-lanes-march.csv,Rotterdam freight lane summary,EU,2026
gas,612,therm,MX-MCW,2026-03-12,monterrey-process-heat-march.pdf,Process heat demand,,
waste,320,kg (landfill),NL-RFH,2026-03-11,rotterdam-packaging-waste.csv,Residual packaging waste,,`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eco-loom-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV template downloaded.');
  };

  const getStatusIcon = (status: ProcessingQueueItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'queued':
      case 'storing':
      case 'parsing':
      case 'importing':
        return <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ProcessingQueueItem['status']) => {
    const className: Record<ProcessingQueueItem['status'], string> = {
      queued: 'border-slate-200 bg-slate-50 text-slate-700',
      storing: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      parsing: 'border-sky-200 bg-sky-50 text-sky-700',
      importing: 'border-amber-200 bg-amber-50 text-amber-700',
      completed: 'border-green-200 bg-green-50 text-green-700',
      failed: 'border-red-200 bg-red-50 text-red-700',
    };

    return (
      <Badge variant="outline" className={className[status]}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const selectedFactors = getEmissionFactorsBySourceType(manualForm.sourceType);
  const selectedFactor = selectedFactors.find((factor) => factor.activityUnit === manualForm.activityUnit);
  const scopedDepartments = selectedFacilityId
    ? departments.filter((department) => department.id === selectedFacilityId)
    : departments;
  const overrideFactorValue = Number.parseFloat(manualFactorOverride.emissionFactor);
  const appliedFactorValue =
    manualFactorOverrideEnabled && Number.isFinite(overrideFactorValue) && overrideFactorValue > 0
      ? overrideFactorValue
      : selectedFactor?.factor;
  const calculatedEmissions =
    appliedFactorValue && manualForm.activityValue
      ? Number.parseFloat(manualForm.activityValue) * appliedFactorValue
      : null;
  const uploadFacilityValue = selectedFacilityId || uploadFacilityId || 'workspace';
  const csvFacilityValue = selectedFacilityId || csvFacilityId || 'workspace';

  return (
    <div className="space-y-6">
      <DashboardHeroCard
        title="Data Ingest Layer"
        description={
          isAdmin
            ? 'Store source evidence, import validated CSV files, or add ledger activity manually from one controlled intake surface.'
            : 'Standard users can add ledger activity manually. Evidence upload and CSV import stay under admin control.'
        }
        icon={<Upload className="h-8 w-8" />}
        gradientClassName="bg-gradient-to-r from-emerald-600 via-green-500 to-lime-500"
        eyebrow="Operational Intake"
        eyebrowIcon={<Upload className="h-3.5 w-3.5" />}
      />

      {!isAdmin && (
        <Card className="border-blue-200 bg-blue-50/80">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Manual entry only for standard users</p>
              <p className="text-sm text-blue-700">
                Admins handle evidence storage and bulk CSV import so ingest remains controlled and audit logged.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'upload' | 'manual' | 'csv')}
        className="space-y-6"
      >
        <TabsList className="border bg-white p-1 shadow-sm">
          {isAdmin && (
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Evidence Upload
            </TabsTrigger>
          )}
          <TabsTrigger value="manual" className="gap-2">
            <FileText className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="csv" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              CSV Import
            </TabsTrigger>
          )}
        </TabsList>

        {isAdmin && (
          <TabsContent value="upload" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-emerald-600" />
                    Store Supporting Evidence
                  </CardTitle>
                  <CardDescription>
                    Upload PDF, PNG, or JPG evidence files. Each upload is stored, scoped, and audit logged for later ledger review.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Facility / Site Scope</Label>
                    <Select
                      value={uploadFacilityValue}
                      onValueChange={(value) => setUploadFacilityId(value === 'workspace' ? '' : value)}
                      disabled={Boolean(selectedFacilityId)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose workspace or facility scope" />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedFacilityId && (
                          <SelectItem value="workspace">Workspace-wide evidence</SelectItem>
                        )}
                        {scopedDepartments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name} ({department.country || department.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div
                    className="cursor-pointer rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-8 text-center transition-colors hover:border-emerald-500"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(event) =>
                        handleIngestUpload(
                          event.target.files,
                          'evidence_upload',
                          selectedFacilityId || uploadFacilityId || undefined
                        )
                      }
                    />
                    <Upload className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
                    <p className="text-lg font-medium">Drop evidence here or click to upload</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Files are stored securely for audit review and can be opened again from recent ingest activity.
                    </p>
                    <Button variant="outline" className="mt-5 gap-2" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Select Evidence Files
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-100 bg-emerald-50/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-900">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    Intake Controls
                  </CardTitle>
                  <CardDescription className="text-emerald-800/80">
                    This upload flow is now storage-first and review-ready. Nothing is silently OCR’d or auto-classified in the background.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-emerald-900">
                  <div className="rounded-lg border border-emerald-200 bg-white/80 p-4">
                    <p className="font-medium">What happens on upload</p>
                    <ul className="mt-2 space-y-2 text-emerald-800/90">
                      <li>File type and size are validated server-side.</li>
                      <li>The document is stored in the workspace evidence vault.</li>
                      <li>The upload is written to the audit trail and recent ingest activity.</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-white/80 p-4">
                    <p className="font-medium">Use this for</p>
                    <ul className="mt-2 space-y-2 text-emerald-800/90">
                      <li>Utility bills, fuel receipts, waste manifests, freight records, or scanned invoices.</li>
                      <li>Evidence that should stay accessible before someone keys the activity into the ledger.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Recent Ingest Activity</CardTitle>
                  <CardDescription>
                    Stored evidence uploads and CSV imports for the current workspace scope.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={fetchProcessingQueue} disabled={isRefreshingJobs}>
                  {isRefreshingJobs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {processingQueue.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <Upload className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No evidence uploads or CSV imports recorded yet.</p>
                    <p className="text-sm">New ingest jobs will appear here after they are stored or imported.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {processingQueue.map((item) => (
                      <div key={item.id} className="rounded-xl border p-4 transition-colors hover:bg-muted/30">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            {getStatusIcon(item.status)}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium">{item.fileName}</p>
                              {getStatusBadge(item.status)}
                              <Badge variant="secondary" className="capitalize">
                                {item.ingestType === 'csv_import' ? 'CSV Import' : 'Evidence Upload'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(item.fileSize)}
                              {item.departmentName ? ` • ${item.departmentName}` : ''}
                              {' • '}
                              {new Date(item.uploadedAt).toLocaleString()}
                            </p>
                            {item.message && <p className="text-sm text-muted-foreground">{item.message}</p>}
                            {(item.rowCount || item.createdEntries || item.failedRows) && (
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {item.rowCount ? <span>{item.rowCount} row{item.rowCount === 1 ? '' : 's'} checked</span> : null}
                                {item.createdEntries ? <span>{item.createdEntries} entr{item.createdEntries === 1 ? 'y' : 'ies'} created</span> : null}
                                {item.failedRows ? <span>{item.failedRows} row{item.failedRows === 1 ? '' : 's'} flagged</span> : null}
                              </div>
                            )}
                            {item.status !== 'completed' && item.status !== 'failed' && (
                              <Progress value={item.progress} className="h-1.5" />
                            )}
                            {item.error && <p className="text-sm text-red-600">{item.error}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!item.documentUrl}
                              onClick={() => item.documentUrl && window.open(item.documentUrl, '_blank', 'noopener,noreferrer')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual Entry</CardTitle>
              <CardDescription>
                Add emissions data directly with approved emission factors applied automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Source Type</Label>
                    <Select
                      value={manualForm.sourceType}
                      onValueChange={(value: SourceType) =>
                        setManualForm((prev) => ({ ...prev, sourceType: value, activityUnit: '' }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electricity">⚡ Electricity</SelectItem>
                        <SelectItem value="travel">✈️ Travel</SelectItem>
                        <SelectItem value="shipping">📦 Shipping</SelectItem>
                        <SelectItem value="gas">🔥 Natural Gas</SelectItem>
                        <SelectItem value="waste">🗑️ Waste</SelectItem>
                        <SelectItem value="water">💧 Water</SelectItem>
                        <SelectItem value="other">📋 Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Activity Value *</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 2450"
                        value={manualForm.activityValue}
                        onChange={(event) =>
                          setManualForm((prev) => ({ ...prev, activityValue: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit *</Label>
                      <Select
                        value={manualForm.activityUnit}
                        onValueChange={(value) =>
                          setManualForm((prev) => ({ ...prev, activityUnit: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedFactors.map((factor) => (
                            <SelectItem
                              key={`${factor.activityUnit}-${factor.region ?? 'default'}`}
                              value={factor.activityUnit}
                            >
                              {factor.activityUnit} ({factor.scope})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Facility / Site *</Label>
                    <Select
                      value={manualForm.department}
                      onValueChange={(value) => setManualForm((prev) => ({ ...prev, department: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select facility or site" />
                      </SelectTrigger>
                      <SelectContent>
                        {scopedDepartments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name} ({department.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Transaction Date</Label>
                    <Input
                      type="date"
                      value={manualForm.transactionDate}
                      onChange={(event) =>
                        setManualForm((prev) => ({ ...prev, transactionDate: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Source Document (Optional)</Label>
                    <Input
                      placeholder="e.g., Invoice #12345"
                      value={manualForm.sourceDocument}
                      onChange={(event) =>
                        setManualForm((prev) => ({ ...prev, sourceDocument: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      placeholder="Add context, review notes, or supporting details."
                      value={manualForm.description}
                      onChange={(event) =>
                        setManualForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      rows={3}
                    />
                  </div>

                  {isAdmin && manualForm.activityUnit && (
                    <Card className="border-amber-200 bg-amber-50/70">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-sm">Custom Factor Override</CardTitle>
                            <CardDescription className="text-xs">
                              Admin-only override for approved exceptions. Every override is audit logged.
                            </CardDescription>
                          </div>
                          <Switch
                            checked={manualFactorOverrideEnabled}
                            onCheckedChange={setManualFactorOverrideEnabled}
                            aria-label="Toggle custom factor override"
                          />
                        </div>
                      </CardHeader>
                      {manualFactorOverrideEnabled && (
                        <CardContent className="space-y-3 pt-0">
                          <div className="space-y-2">
                            <Label>Override Factor *</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              placeholder={selectedFactor ? String(selectedFactor.factor) : 'Enter custom factor'}
                              value={manualFactorOverride.emissionFactor}
                              onChange={(event) =>
                                setManualFactorOverride((prev) => ({
                                  ...prev,
                                  emissionFactor: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Override Reason *</Label>
                            <Textarea
                              placeholder="Explain why the approved factor library cannot be used for this entry."
                              value={manualFactorOverride.reason}
                              onChange={(event) =>
                                setManualFactorOverride((prev) => ({
                                  ...prev,
                                  reason: event.target.value,
                                }))
                              }
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Override Source (Optional)</Label>
                            <Input
                              placeholder="e.g., Supplier-specific emissions study"
                              value={manualFactorOverride.source}
                              onChange={(event) =>
                                setManualFactorOverride((prev) => ({
                                  ...prev,
                                  source: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )}

                  {manualForm.activityUnit && (
                    <Card className="bg-muted/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Applied Emission Factor</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedFactor && appliedFactorValue ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Factor:</span>
                              <span className="font-mono">
                                {appliedFactorValue} {selectedFactor.factorUnit}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Scope:</span>
                              <span>{selectedFactor.scope}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Mode:</span>
                              <span>{manualFactorOverrideEnabled ? 'Custom override' : 'Approved library'}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="font-medium">Calculated CO2e:</span>
                              <span className="font-bold text-green-600">
                                {formatCo2e(calculatedEmissions ?? 0)}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  )}

                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleManualSubmit}
                    disabled={
                      isSubmitting ||
                      !manualForm.activityValue ||
                      !manualForm.activityUnit ||
                      !(selectedFacilityId || manualForm.department)
                    }
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Add to Carbon Ledger
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="csv" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>CSV Bulk Import</CardTitle>
                  <CardDescription>
                    Import ledger rows from a CSV file. Each row is validated against facility scope and approved emission factors before it lands in the ledger.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Fallback Facility / Site</Label>
                    <Select
                      value={csvFacilityValue}
                      onValueChange={(value) => setCsvFacilityId(value === 'workspace' ? '' : value)}
                      disabled={Boolean(selectedFacilityId)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a fallback facility" />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedFacilityId && (
                          <SelectItem value="workspace">Require facility in every row</SelectItem>
                        )}
                        {scopedDepartments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name} ({department.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      If a CSV row does not provide a facility code or facility ID, this fallback scope will be used.
                    </p>
                  </div>

                  <div
                    className="cursor-pointer rounded-xl border-2 border-dashed border-lime-300 bg-lime-50/60 p-8 text-center transition-colors hover:border-lime-500"
                    onClick={() => csvInputRef.current?.click()}
                  >
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(event) =>
                        handleIngestUpload(
                          event.target.files,
                          'csv_import',
                          selectedFacilityId || csvFacilityId || undefined
                        )
                      }
                    />
                    <FileSpreadsheet className="mx-auto mb-4 h-12 w-12 text-lime-600" />
                    <p className="text-lg font-medium">Upload CSV File</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      CSV only in this workspace. XLSX is intentionally disabled until a true spreadsheet parser is added.
                    </p>
                    <Button variant="outline" className="mt-5 gap-2" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                      Select CSV File
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full gap-2" onClick={downloadCsvTemplate}>
                    <FileSpreadsheet className="h-4 w-4" />
                    Download CSV Template
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-lime-100 bg-lime-50/30">
                <CardHeader>
                  <CardTitle>Expected CSV Columns</CardTitle>
                  <CardDescription>
                    Use facility-aware columns so imports align with the multi-site dashboard and reporting model.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <pre className="overflow-x-auto rounded-lg border bg-white p-4 text-xs">
{`source_type,activity_value,activity_unit,facility_code,transaction_date,source_document,notes,factor_region,factor_year
electricity,18144,kWh,US-CMC,2026-03-18,cascadia-grid-load-march.pdf,Cascadia grid load,US,2026
travel,940,km (flight),SG-SES,2026-03-07,singapore-regional-workshops.csv,Regional workshop travel,,
shipping,12480,tonne-km,NL-RFH,2026-03-14,rotterdam-freight-lanes-march.csv,Rotterdam freight lane summary,EU,2026`}
                  </pre>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Required:</strong> source_type, activity_value, activity_unit, transaction_date</p>
                    <p><strong>Facility match:</strong> use the exact site key from Facility Setup in `facility_code`, or provide `facility_id`, or choose a fallback facility above</p>
                    <p><strong>Optional:</strong> source_document, notes, factor_region, factor_year, reporting_period</p>
                    <p>Each imported row stays unverified until someone reviews it in the carbon ledger.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
