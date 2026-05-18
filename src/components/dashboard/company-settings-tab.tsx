'use client';

import { Building2 } from 'lucide-react';
import { CompanyProfileSettingsCard } from '@/components/dashboard/company-profile-settings-card';
import { DashboardHeroCard } from '@/components/dashboard/dashboard-hero-card';
import { ReportDefaultSettingsCard } from '@/components/dashboard/report-default-settings-card';

export function CompanySettingsTab() {
  return (
    <div className="space-y-6">
      <DashboardHeroCard
        eyebrow="Admin Configuration"
        title="Company Settings"
        description="Centralize report-generation defaults, methodology preferences, and disclosure conventions in one admin surface."
        icon={<Building2 className="h-6 w-6" />}
        gradientClassName="bg-[linear-gradient(135deg,#10b981_0%,#0f766e_100%)]"
        aside={
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/85">
            Admin only
          </div>
        }
      />

      <CompanyProfileSettingsCard />
      <ReportDefaultSettingsCard />
    </div>
  );
}
