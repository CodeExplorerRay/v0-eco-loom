import type { FacilityType } from '@/lib/types';

export const COUNTRY_OPTIONS = [
  { code: 'CN', label: 'China' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'ID', label: 'Indonesia' },
  { code: 'IN', label: 'India' },
  { code: 'JP', label: 'Japan' },
  { code: 'KR', label: 'South Korea' },
  { code: 'MX', label: 'Mexico' },
  { code: 'MY', label: 'Malaysia' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'PH', label: 'Philippines' },
  { code: 'PL', label: 'Poland' },
  { code: 'SG', label: 'Singapore' },
  { code: 'TH', label: 'Thailand' },
  { code: 'US', label: 'United States' },
  { code: 'VN', label: 'Vietnam' },
] as const;

export const FACILITY_BLUEPRINTS: Array<{
  value: FacilityType;
  label: string;
  description: string;
  outcome: string;
  accentClassName: string;
  lenses: string[];
}> = [
  {
    value: 'production_campus',
    label: 'Production Campus',
    description: 'Built for plants, fabrication floors, and energy-heavy operational sites.',
    outcome: 'Prioritizes fuel, steam, freight, waste, and line-level utility visibility.',
    accentClassName: 'from-emerald-500/20 via-lime-500/12 to-white',
    lenses: ['fuel', 'steam', 'electricity', 'freight', 'waste'],
  },
  {
    value: 'hq_office',
    label: 'HQ Office',
    description: 'Best for offices, corporate hubs, and distributed knowledge-work spaces.',
    outcome: 'Highlights electricity, heating/cooling, commuting, and business travel patterns.',
    accentClassName: 'from-teal-500/18 via-emerald-500/10 to-white',
    lenses: ['electricity', 'cooling', 'commuting', 'travel', 'procurement'],
  },
  {
    value: 'logistics_hub',
    label: 'Logistics Hub',
    description: 'Designed for warehouses, distribution centers, and freight-intensive sites.',
    outcome: 'Surfaces delivery miles, cold storage loads, packaging, and fleet movement.',
    accentClassName: 'from-cyan-500/18 via-teal-500/10 to-white',
    lenses: ['fleet', 'forklifts', 'cold storage', 'packaging', 'freight'],
  },
  {
    value: 'retail_studio',
    label: 'Retail Studio',
    description: 'Works well for stores, showrooms, hospitality venues, and customer-facing sites.',
    outcome: 'Focuses on HVAC, lighting, refrigerants, waste, and shipped goods.',
    accentClassName: 'from-lime-500/18 via-emerald-500/12 to-white',
    lenses: ['lighting', 'hvac', 'refrigerants', 'waste', 'purchased goods'],
  },
  {
    value: 'innovation_lab',
    label: 'Innovation Lab',
    description: 'Ideal for R&D spaces, technical labs, pilot lines, and testing environments.',
    outcome: 'Elevates specialty equipment, gases, water, travel, and prototype materials.',
    accentClassName: 'from-green-500/18 via-teal-500/10 to-white',
    lenses: ['equipment load', 'gases', 'water', 'travel', 'prototype materials'],
  },
] as const;

export const FACILITY_TYPE_VALUES = FACILITY_BLUEPRINTS.map((blueprint) => blueprint.value);

export function getFacilityBlueprint(facilityType?: string | null) {
  return FACILITY_BLUEPRINTS.find((blueprint) => blueprint.value === facilityType) || null;
}

export function getCountryLabel(countryCode?: string | null) {
  if (!countryCode) {
    return '';
  }

  return COUNTRY_OPTIONS.find((country) => country.code === countryCode)?.label || '';
}

export function suggestFacilityCode(name: string, countryCode?: string | null) {
  const compactName = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const initials = compactName.map((part) => part.charAt(0).toUpperCase()).join('');
  const fallback = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  const core = (initials || fallback || 'SITE').slice(0, 4);

  return countryCode ? `${countryCode}-${core}`.slice(0, 10) : core;
}
