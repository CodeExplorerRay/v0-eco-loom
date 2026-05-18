'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getReportModeProfile } from '@/lib/reports/report-modes';
import { formatCo2e } from '@/lib/utils';
import type {
  Company,
  ManagedUser,
  OrganizationalBoundaryMethod,
  ReportBoundaryMetadata,
  ReportMethodologyMetadata,
  ReportMode,
  Scope2Method,
} from '@/lib/types';

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

const boundaryMethods: { value: OrganizationalBoundaryMethod; label: string }[] = [
  { value: 'operational_control', label: 'Operational Control' },
  { value: 'financial_control', label: 'Financial Control' },
  { value: 'equity_share', label: 'Equity Share' },
];

const scope2Methods: { value: Scope2Method; label: string; description: string }[] = [
  {
    value: 'location_based',
    label: 'Location-Based',
    description: 'Use the location-based Scope 2 total derived from ledger evidence.',
  },
  {
    value: 'market_based',
    label: 'Market-Based',
    description: 'Use a manually supplied market-based Scope 2 total.',
  },
  {
    value: 'dual_reporting',
    label: 'Dual Reporting',
    description: 'Disclose both location-based and market-based Scope 2 results.',
  },
];

type CompanyReportDefaults = Pick<
  Company,
  | 'defaultReportMode'
  | 'defaultReportingStandard'
  | 'defaultGwpBasis'
  | 'defaultFactorSourcePolicy'
  | 'defaultOverridePolicy'
  | 'defaultReportOwnerName'
  | 'defaultReportOwnerEmail'
  | 'defaultReportReviewerIds'
  | 'defaultReportRecipients'
  | 'defaultApprovalWorkflow'
  | 'defaultOrganizationalBoundaryMethod'
  | 'defaultOrganizationalBoundaryNotes'
  | 'defaultBaseYear'
  | 'defaultBaseYearNotes'
  | 'defaultBaseYearRecalculationPolicy'
  | 'defaultScope2Method'
  | 'defaultScope2MarketBasedEmissions'
  | 'defaultScope2DisclosureNotes'
  | 'defaultScope2InstrumentNotes'
  | 'annualDisclosureNotes'
>;

type ReportDefaultsPreview = {
  reportMode: ReportMode;
  reportingPeriod: string;
  methodologyMetadata: ReportMethodologyMetadata;
  boundaryMetadata: ReportBoundaryMetadata;
  factorProvenanceSummary: string;
  entryCount: number;
};

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
  defaultReportReviewerIds: '[]',
  defaultReportRecipients: '',
  defaultApprovalWorkflow:
    'Sustainability lead review followed by admin approval before publication.',
  defaultOrganizationalBoundaryMethod: 'operational_control',
  defaultOrganizationalBoundaryNotes:
    'The reporting entity follows the configured organizational control boundary for this workspace.',
  defaultBaseYear: undefined,
  defaultBaseYearNotes: '',
  defaultBaseYearRecalculationPolicy: '',
  defaultScope2Method: 'location_based',
  defaultScope2MarketBasedEmissions: undefined,
  defaultScope2DisclosureNotes: '',
  defaultScope2InstrumentNotes: '',
  annualDisclosureNotes: '',
};

export function ReportDefaultSettingsCard() {
  const [reportDefaults, setReportDefaults] =
    useState<CompanyReportDefaults>(DEFAULT_REPORT_DEFAULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<ReportDefaultsPreview | null>(null);
  const [availableReviewers, setAvailableReviewers] = useState<ManagedUser[]>([]);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadDefaults = async () => {
      setIsLoading(true);
      try {
        const [companiesResponse, usersResponse] = await Promise.all([
          fetch('/api/companies', { cache: 'no-store' }),
          fetch('/api/users', { cache: 'no-store' }),
        ]);
        if (!companiesResponse.ok) {
          throw new Error('Failed to load report defaults');
        }
        if (!usersResponse.ok) {
          throw new Error('Failed to load reviewers');
        }

        const companies = (await companiesResponse.json()) as Company[];
        const users = (await usersResponse.json()) as ManagedUser[];
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
          defaultReportReviewerIds: company?.defaultReportReviewerIds || '[]',
          defaultReportRecipients: company?.defaultReportRecipients || '',
          defaultApprovalWorkflow:
            company?.defaultApprovalWorkflow || DEFAULT_REPORT_DEFAULTS.defaultApprovalWorkflow,
          defaultOrganizationalBoundaryMethod:
            company?.defaultOrganizationalBoundaryMethod ||
            DEFAULT_REPORT_DEFAULTS.defaultOrganizationalBoundaryMethod,
          defaultOrganizationalBoundaryNotes:
            company?.defaultOrganizationalBoundaryNotes ||
            DEFAULT_REPORT_DEFAULTS.defaultOrganizationalBoundaryNotes,
          defaultBaseYear: company?.defaultBaseYear,
          defaultBaseYearNotes: company?.defaultBaseYearNotes || '',
          defaultBaseYearRecalculationPolicy:
            company?.defaultBaseYearRecalculationPolicy || '',
          defaultScope2Method:
            company?.defaultScope2Method || DEFAULT_REPORT_DEFAULTS.defaultScope2Method,
          defaultScope2MarketBasedEmissions:
            company?.defaultScope2MarketBasedEmissions,
          defaultScope2DisclosureNotes: company?.defaultScope2DisclosureNotes || '',
          defaultScope2InstrumentNotes: company?.defaultScope2InstrumentNotes || '',
          annualDisclosureNotes: company?.annualDisclosureNotes || '',
        };

        if (!cancelled) {
          setReportDefaults(nextDefaults);
          setAvailableReviewers(users.filter((user) => user.status === 'active'));
          setSelectedReviewerIds(parseStoredReviewerIds(nextDefaults.defaultReportReviewerIds));
          void loadPreview(nextDefaults);
        }
      } catch (error) {
        console.error('Error loading report defaults:', error);
        if (!cancelled) {
          toast.error('Failed to load report defaults');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDefaults();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadPreview = async (defaults = reportDefaults) => {
    setIsPreviewLoading(true);
    try {
      const response = await fetch('/api/companies/report-default-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaults),
      });

      const result = (await response.json().catch(() => ({ error: 'Failed to build preview' }))) as
        | ReportDefaultsPreview
        | { error?: string };

      if (!response.ok) {
        throw new Error('error' in result ? result.error || 'Failed to build preview' : 'Failed to build preview');
      }

      setPreview(result as ReportDefaultsPreview);
    } catch (error) {
      console.error('Error previewing report defaults:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to build preview');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportDefaults),
      });

      const result = (await response.json().catch(() => ({ error: 'Failed to update report defaults' }))) as
        | Company
        | { error?: string };

      if (!response.ok) {
        throw new Error('error' in result ? result.error || 'Failed to update report defaults' : 'Failed to update report defaults');
      }

      const updatedCompany = result as Company;
      const nextDefaults: CompanyReportDefaults = {
        defaultReportMode: (updatedCompany.defaultReportMode || 'internal_management') as ReportMode,
        defaultReportingStandard:
          updatedCompany.defaultReportingStandard || DEFAULT_REPORT_DEFAULTS.defaultReportingStandard,
        defaultGwpBasis: updatedCompany.defaultGwpBasis || DEFAULT_REPORT_DEFAULTS.defaultGwpBasis,
        defaultFactorSourcePolicy: updatedCompany.defaultFactorSourcePolicy || '',
        defaultOverridePolicy:
          updatedCompany.defaultOverridePolicy || DEFAULT_REPORT_DEFAULTS.defaultOverridePolicy,
        defaultReportOwnerName: updatedCompany.defaultReportOwnerName || '',
        defaultReportOwnerEmail: updatedCompany.defaultReportOwnerEmail || '',
        defaultReportReviewerIds: updatedCompany.defaultReportReviewerIds || '[]',
        defaultReportRecipients: updatedCompany.defaultReportRecipients || '',
        defaultApprovalWorkflow:
          updatedCompany.defaultApprovalWorkflow || DEFAULT_REPORT_DEFAULTS.defaultApprovalWorkflow,
        defaultOrganizationalBoundaryMethod:
          updatedCompany.defaultOrganizationalBoundaryMethod ||
          DEFAULT_REPORT_DEFAULTS.defaultOrganizationalBoundaryMethod,
        defaultOrganizationalBoundaryNotes:
          updatedCompany.defaultOrganizationalBoundaryNotes ||
          DEFAULT_REPORT_DEFAULTS.defaultOrganizationalBoundaryNotes,
        defaultBaseYear: updatedCompany.defaultBaseYear,
        defaultBaseYearNotes: updatedCompany.defaultBaseYearNotes || '',
        defaultBaseYearRecalculationPolicy:
          updatedCompany.defaultBaseYearRecalculationPolicy || '',
        defaultScope2Method:
          updatedCompany.defaultScope2Method || DEFAULT_REPORT_DEFAULTS.defaultScope2Method,
        defaultScope2MarketBasedEmissions:
          updatedCompany.defaultScope2MarketBasedEmissions,
        defaultScope2DisclosureNotes: updatedCompany.defaultScope2DisclosureNotes || '',
        defaultScope2InstrumentNotes: updatedCompany.defaultScope2InstrumentNotes || '',
        annualDisclosureNotes: updatedCompany.annualDisclosureNotes || '',
      };

      setReportDefaults(nextDefaults);
      setSelectedReviewerIds(parseStoredReviewerIds(nextDefaults.defaultReportReviewerIds));
      toast.success('Report defaults updated');
      await loadPreview(nextDefaults);
    } catch (error) {
      console.error('Error updating report defaults:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update report defaults');
    } finally {
      setIsSaving(false);
    }
  };

  const previewProfile = getReportModeProfile(
    preview?.reportMode || reportDefaults.defaultReportMode || 'internal_management'
  );

  const handleRestoreRecommendedDefaults = () => {
    setReportDefaults(DEFAULT_REPORT_DEFAULTS);
    setSelectedReviewerIds([]);
    void loadPreview(DEFAULT_REPORT_DEFAULTS);
    toast.info('Recommended defaults restored locally. Save when you are ready to apply them.');
  };

  const toggleReviewer = (reviewer: ManagedUser) => {
    setSelectedReviewerIds((prev) => {
      const nextIds = prev.includes(reviewer.id)
        ? prev.filter((id) => id !== reviewer.id)
        : [...prev, reviewer.id];
      const selectedUsers = availableReviewers.filter((user) => nextIds.includes(user.id));

      setReportDefaults((current) => ({
        ...current,
        defaultReportReviewerIds: JSON.stringify(nextIds),
        defaultReportRecipients: selectedUsers.map((user) => user.email).join(', '),
      }));

      return nextIds;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Report Defaults</CardTitle>
              <CardDescription>
                Move long-term reporting preferences out of day-to-day report generation and keep methodology language consistent across the workspace.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verifier template lock
              </Badge>
              <Badge variant="outline">Annual disclosure lock</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultReportMode">Default Report Mode</Label>
              <Select
                value={reportDefaults.defaultReportMode || 'internal_management'}
                onValueChange={(value: ReportMode) =>
                  setReportDefaults((prev) => ({ ...prev, defaultReportMode: value }))
                }
              >
                <SelectTrigger id="defaultReportMode">
                  <SelectValue placeholder="Select a default mode" />
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultReportingStandard">Preferred Standard</Label>
              <Input
                id="defaultReportingStandard"
                value={reportDefaults.defaultReportingStandard || ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultReportingStandard: event.target.value,
                  }))
                }
                placeholder="GHG Protocol Corporate Standard"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultReportOwnerName">Default Report Owner</Label>
              <Input
                id="defaultReportOwnerName"
                value={reportDefaults.defaultReportOwnerName || ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultReportOwnerName: event.target.value,
                  }))
                }
                placeholder="Sustainability Lead"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultReportOwnerEmail">Default Owner Email</Label>
              <Input
                id="defaultReportOwnerEmail"
                type="email"
                value={reportDefaults.defaultReportOwnerEmail || ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultReportOwnerEmail: event.target.value,
                  }))
                }
                placeholder="sustainability@company.com"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Reviewers</Label>
              <div className="rounded-lg border bg-muted/20 p-3">
                {availableReviewers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableReviewers.map((reviewer) => {
                      const selected = selectedReviewerIds.includes(reviewer.id);
                      return (
                        <Button
                          key={reviewer.id}
                          type="button"
                          variant={selected ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start"
                          onClick={() => toggleReviewer(reviewer)}
                        >
                          {reviewer.name}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active workspace users are available to assign as default reviewers.
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Selected reviewers are stored by workspace user ID and their emails are carried into report recipient snapshots automatically.
                </p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Reviewer Recipient Snapshot
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {reportDefaults.defaultReportRecipients || 'No reviewer recipients selected yet.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultApprovalWorkflow">Default Approval Workflow</Label>
              <Textarea
                id="defaultApprovalWorkflow"
                value={reportDefaults.defaultApprovalWorkflow || ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultApprovalWorkflow: event.target.value,
                  }))
                }
                placeholder="Describe who reviews, who approves, and when a report can be published."
                rows={3}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultOrganizationalBoundaryMethod">
                Organizational Boundary Method
              </Label>
              <Select
                value={
                  reportDefaults.defaultOrganizationalBoundaryMethod || 'operational_control'
                }
                onValueChange={(value: OrganizationalBoundaryMethod) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultOrganizationalBoundaryMethod: value,
                  }))
                }
              >
                <SelectTrigger id="defaultOrganizationalBoundaryMethod">
                  <SelectValue placeholder="Select a boundary method" />
                </SelectTrigger>
                <SelectContent>
                  {boundaryMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultBaseYear">Base Year</Label>
              <Input
                id="defaultBaseYear"
                type="number"
                value={reportDefaults.defaultBaseYear ?? ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultBaseYear: event.target.value
                      ? Number.parseInt(event.target.value, 10)
                      : undefined,
                  }))
                }
                placeholder="2024"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultOrganizationalBoundaryNotes">Boundary Notes</Label>
              <Textarea
                id="defaultOrganizationalBoundaryNotes"
                value={reportDefaults.defaultOrganizationalBoundaryNotes || ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultOrganizationalBoundaryNotes: event.target.value,
                  }))
                }
                placeholder="Describe inclusions, exclusions, and consolidation assumptions for the reporting entity."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultBaseYearRecalculationPolicy">
                Base Year Recalculation Policy
              </Label>
              <Textarea
                id="defaultBaseYearRecalculationPolicy"
                value={reportDefaults.defaultBaseYearRecalculationPolicy || ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultBaseYearRecalculationPolicy: event.target.value,
                  }))
                }
                placeholder="Describe when structural or methodological changes trigger a base-year restatement."
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultBaseYearNotes">Base Year Notes</Label>
            <Textarea
              id="defaultBaseYearNotes"
              value={reportDefaults.defaultBaseYearNotes || ''}
              onChange={(event) =>
                setReportDefaults((prev) => ({
                  ...prev,
                  defaultBaseYearNotes: event.target.value,
                }))
              }
              placeholder="Add any base-year exclusions, restatements, or coverage caveats."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultGwpBasis">Default GWP Basis</Label>
              <Input
                id="defaultGwpBasis"
                value={reportDefaults.defaultGwpBasis || ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultGwpBasis: event.target.value,
                  }))
                }
                placeholder="AR5 or factor-library basis disclosure"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultFactorSourcePolicy">Default Factor Source Policy</Label>
              <Textarea
                id="defaultFactorSourcePolicy"
                value={reportDefaults.defaultFactorSourcePolicy || ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultFactorSourcePolicy: event.target.value,
                  }))
                }
                placeholder="Describe the approved factor library, preferred source hierarchy, and how provenance is disclosed."
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultOverridePolicy">Default Override Policy</Label>
            <Textarea
              id="defaultOverridePolicy"
              value={reportDefaults.defaultOverridePolicy || ''}
              onChange={(event) =>
                setReportDefaults((prev) => ({
                  ...prev,
                  defaultOverridePolicy: event.target.value,
                }))
              }
              placeholder="Describe when custom factor overrides are allowed and how they must be justified."
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultScope2Method">Default Scope 2 Method</Label>
              <Select
                value={reportDefaults.defaultScope2Method || 'location_based'}
                onValueChange={(value: Scope2Method) =>
                  setReportDefaults((prev) => ({ ...prev, defaultScope2Method: value }))
                }
              >
                <SelectTrigger id="defaultScope2Method">
                  <SelectValue placeholder="Select a Scope 2 method" />
                </SelectTrigger>
                <SelectContent>
                  {scope2Methods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      <div>
                        <p className="font-medium">{method.label}</p>
                        <p className="text-xs text-muted-foreground">{method.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultScope2MarketBasedEmissions">
                Market-Based Scope 2 Total
              </Label>
              <Input
                id="defaultScope2MarketBasedEmissions"
                type="number"
                step="0.01"
                value={reportDefaults.defaultScope2MarketBasedEmissions ?? ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultScope2MarketBasedEmissions: event.target.value
                      ? Number.parseFloat(event.target.value)
                      : undefined,
                  }))
                }
                placeholder="kg CO2e"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultScope2DisclosureNotes">Scope 2 Disclosure Notes</Label>
              <Textarea
                id="defaultScope2DisclosureNotes"
                value={reportDefaults.defaultScope2DisclosureNotes || ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultScope2DisclosureNotes: event.target.value,
                  }))
                }
                placeholder="Explain residual mix assumptions, supplier data hierarchy, or market-based caveats."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultScope2InstrumentNotes">Contractual Instrument Notes</Label>
              <Textarea
                id="defaultScope2InstrumentNotes"
                value={reportDefaults.defaultScope2InstrumentNotes || ''}
                onChange={(event) =>
                  setReportDefaults((prev) => ({
                    ...prev,
                    defaultScope2InstrumentNotes: event.target.value,
                  }))
                }
                placeholder="Summarize RECs, PPAs, green tariffs, or other contractual instruments used in Scope 2 accounting."
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annualDisclosureNotes">Annual Disclosure Conventions</Label>
            <Textarea
              id="annualDisclosureNotes"
              value={reportDefaults.annualDisclosureNotes || ''}
              onChange={(event) =>
                setReportDefaults((prev) => ({
                  ...prev,
                  annualDisclosureNotes: event.target.value,
                }))
              }
              placeholder="Add disclosure-specific language for annual reports, exclusions, or external reporting conventions."
              rows={4}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? 'Loading saved defaults...'
                : 'Verifier Ready and Annual Disclosure use locked methodology templates automatically, while still inheriting owner and disclosure context from these defaults.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleRestoreRecommendedDefaults}
                disabled={isLoading || isSaving}
              >
                Restore Recommended Defaults
              </Button>
              <Button
                variant="outline"
                onClick={() => void loadPreview()}
                disabled={isLoading || isPreviewLoading}
              >
                {isPreviewLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Refresh Preview
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isLoading}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Defaults
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Generated Preview</CardTitle>
              <CardDescription>
                Preview the methodology and boundary text that Eco-Loom will generate from these settings before saving them.
              </CardDescription>
            </div>
            {preview && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{previewProfile.label}</Badge>
                <Badge variant="outline">{preview.reportingPeriod}</Badge>
                <Badge variant="outline">{preview.entryCount} evidence rows</Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview ? (
            <>
              {previewProfile.usesLockedMethodologyTemplate && previewProfile.lockedMethodologySummary && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {previewProfile.lockedMethodologySummary}
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-lg border bg-background p-4">
                  <div>
                    <h3 className="font-medium">Methodology Preview</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {preview.methodologyMetadata.reportingStandard}
                    </p>
                  </div>
                  <PreviewRow label="GWP Basis" value={preview.methodologyMetadata.gwpBasis} />
                  <PreviewRow
                    label="Factor Source Policy"
                    value={preview.methodologyMetadata.factorSourcePolicy}
                  />
                  <PreviewRow
                    label="Override Policy"
                    value={preview.methodologyMetadata.overridePolicy}
                  />
                  <PreviewRow
                    label="Methodology Notes"
                    value={preview.methodologyMetadata.methodologyNotes}
                  />
                  {(preview.methodologyMetadata.reportOwnerName ||
                    preview.methodologyMetadata.reportOwnerEmail) && (
                    <PreviewRow
                      label="Owner"
                      value={`${preview.methodologyMetadata.reportOwnerName || 'Unassigned'}${
                        preview.methodologyMetadata.reportOwnerEmail
                          ? ` (${preview.methodologyMetadata.reportOwnerEmail})`
                          : ''
                      }`}
                    />
                  )}
                  {preview.methodologyMetadata.reportRecipients &&
                    preview.methodologyMetadata.reportRecipients.length > 0 && (
                    <PreviewRow
                      label="Default Recipients"
                      value={preview.methodologyMetadata.reportRecipients.join(', ')}
                    />
                  )}
                  {preview.methodologyMetadata.reviewerNames &&
                    preview.methodologyMetadata.reviewerNames.length > 0 && (
                    <PreviewRow
                      label="Reviewer Names"
                      value={preview.methodologyMetadata.reviewerNames.join(', ')}
                    />
                  )}
                  {preview.methodologyMetadata.approvalWorkflow && (
                    <PreviewRow
                      label="Approval Workflow"
                      value={preview.methodologyMetadata.approvalWorkflow}
                    />
                  )}
                  {preview.methodologyMetadata.baseYear !== undefined && (
                    <PreviewRow
                      label="Base Year"
                      value={String(preview.methodologyMetadata.baseYear)}
                    />
                  )}
                  {preview.methodologyMetadata.baseYearRecalculationPolicy && (
                    <PreviewRow
                      label="Recalculation Policy"
                      value={preview.methodologyMetadata.baseYearRecalculationPolicy}
                    />
                  )}
                  {preview.methodologyMetadata.scope2Method && (
                    <PreviewRow
                      label="Scope 2 Method"
                      value={preview.methodologyMetadata.scope2Method.replace(/_/g, ' ')}
                    />
                  )}
                  {preview.methodologyMetadata.scope2LocationBasedEmissions !== undefined && (
                    <PreviewRow
                      label="Scope 2 Location-Based"
                      value={formatCo2e(preview.methodologyMetadata.scope2LocationBasedEmissions)}
                    />
                  )}
                  {preview.methodologyMetadata.scope2MarketBasedEmissions !== undefined && (
                    <PreviewRow
                      label="Scope 2 Market-Based"
                      value={formatCo2e(preview.methodologyMetadata.scope2MarketBasedEmissions)}
                    />
                  )}
                </div>

                <div className="space-y-3 rounded-lg border bg-background p-4">
                  <div>
                    <h3 className="font-medium">Boundary Preview</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {preview.boundaryMetadata.boundarySummary}
                    </p>
                  </div>
                  <PreviewRow
                    label="Included Facilities / Sites"
                    value={
                      preview.boundaryMetadata.includedDepartments.length > 0
                        ? preview.boundaryMetadata.includedDepartments
                            .map((department) =>
                              department.code ? `${department.name} (${department.code})` : department.name
                            )
                            .join(', ')
                        : 'No facilities or sites with activity were found for the preview period.'
                    }
                  />
                  <PreviewRow
                    label="Boundary Exclusions"
                    value={preview.boundaryMetadata.exclusions}
                  />
                  {preview.boundaryMetadata.organizationalBoundaryMethod && (
                    <PreviewRow
                      label="Boundary Method"
                      value={preview.boundaryMetadata.organizationalBoundaryMethod.replace(/_/g, ' ')}
                    />
                  )}
                  {preview.boundaryMetadata.organizationalBoundaryNotes && (
                    <PreviewRow
                      label="Boundary Notes"
                      value={preview.boundaryMetadata.organizationalBoundaryNotes}
                    />
                  )}
                  <PreviewRow
                    label="Factor Provenance Summary"
                    value={preview.factorProvenanceSummary}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              {isPreviewLoading
                ? 'Generating preview...'
                : 'No preview generated yet. Refresh preview to inspect the resulting methodology and boundary language.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function parseStoredReviewerIds(value?: string) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
