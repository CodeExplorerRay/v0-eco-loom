'use client';

import { useEffect, useState } from 'react';
import { Building2, Loader2, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Company } from '@/lib/types';

type CompanyProfileSettings = Pick<
  Company,
  'name' | 'industry' | 'headquarters' | 'employeeCount' | 'annualRevenue' | 'facilityCount'
>;

const DEFAULT_COMPANY_PROFILE: CompanyProfileSettings = {
  name: '',
  industry: '',
  headquarters: '',
  employeeCount: undefined,
  annualRevenue: undefined,
  facilityCount: 0,
};

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'Not set';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function CompanyProfileSettingsCard() {
  const [profile, setProfile] = useState<CompanyProfileSettings>(DEFAULT_COMPANY_PROFILE);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/companies', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load company profile');
        }

        const companies = (await response.json()) as Company[];
        const company = companies[0];

        if (!cancelled && company) {
          setProfile({
            name: company.name || '',
            industry: company.industry || '',
            headquarters: company.headquarters || '',
            employeeCount: company.employeeCount,
            annualRevenue: company.annualRevenue,
            facilityCount: company.facilityCount || 0,
          });
        }
      } catch (error) {
        console.error('Error loading company profile:', error);
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load company profile');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      const result = (await response.json().catch(() => ({ error: 'Failed to update company profile' }))) as
        | Company
        | { error?: string };

      if (!response.ok) {
        throw new Error('error' in result ? result.error || 'Failed to update company profile' : 'Failed to update company profile');
      }

      const updatedCompany = result as Company;
      setProfile({
        name: updatedCompany.name || '',
        industry: updatedCompany.industry || '',
        headquarters: updatedCompany.headquarters || '',
        employeeCount: updatedCompany.employeeCount,
        annualRevenue: updatedCompany.annualRevenue,
        facilityCount: updatedCompany.facilityCount || 0,
      });
      toast.success('Company profile updated');
    } catch (error) {
      console.error('Error updating company profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update company profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Company Profile</CardTitle>
            <CardDescription>
              Maintain the workspace identity and reporting denominators Eco-Loom uses in intensity metrics and company-level disclosures.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <Building2 className="h-3.5 w-3.5" />
              {profile.name || 'Company profile'}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              <MapPin className="h-3.5 w-3.5" />
              {profile.headquarters || 'Headquarters not set'}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Active Facilities / Sites" value={String(profile.facilityCount || 0)} helpText="Calculated automatically from the live facility register." />
          <StatTile label="Industry" value={profile.industry || 'Not set'} helpText="Used to describe the reporting entity in company-level views." />
          <StatTile label="Employees" value={typeof profile.employeeCount === 'number' ? profile.employeeCount.toLocaleString() : 'Not set'} helpText="Used for intensity metrics when employee-based denominators are available." />
          <StatTile label="Annual Revenue" value={formatCurrency(profile.annualRevenue)} helpText="Used for revenue-intensity calculations in analytics and reports." />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={profile.name || ''}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Eco-Loom Workspace"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyIndustry">Industry</Label>
            <Input
              id="companyIndustry"
              value={profile.industry || ''}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  industry: event.target.value,
                }))
              }
              placeholder="Circular Manufacturing & Commerce"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyHeadquarters">Headquarters</Label>
            <Input
              id="companyHeadquarters"
              value={profile.headquarters || ''}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  headquarters: event.target.value,
                }))
              }
              placeholder="Amsterdam, Netherlands"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyEmployeeCount">Employee Count</Label>
            <Input
              id="companyEmployeeCount"
              type="number"
              min="0"
              value={profile.employeeCount ?? ''}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  employeeCount: event.target.value
                    ? Number.parseInt(event.target.value, 10)
                    : undefined,
                }))
              }
              placeholder="680"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyAnnualRevenue">Annual Revenue</Label>
            <Input
              id="companyAnnualRevenue"
              type="number"
              min="0"
              step="0.01"
              value={profile.annualRevenue ?? ''}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  annualRevenue: event.target.value
                    ? Number.parseFloat(event.target.value)
                    : undefined,
                }))
              }
              placeholder="214000000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyFacilityCount">Facility Count</Label>
            <Input
              id="companyFacilityCount"
              value={profile.facilityCount ?? 0}
              disabled
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              This value is derived automatically from your facilities / sites and cannot be edited manually.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {(isLoading || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Company Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatTile({
  label,
  value,
  helpText,
}: {
  label: string;
  value: string;
  helpText: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{helpText}</p>
    </div>
  );
}
