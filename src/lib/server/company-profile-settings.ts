import type { Company } from '@/lib/types';

type CompanyProfileSettingsInput = Pick<
  Company,
  'name' | 'industry' | 'headquarters' | 'employeeCount' | 'annualRevenue'
>;

export type SanitizedCompanyProfileSettings = {
  name: string;
  industry: string | null;
  headquarters: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
};

function normalizeRequiredText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string') {
    throw new Error(`${label} is required.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized.slice(0, maxLength);
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error('Expected a text value.');
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null;
}

function normalizeOptionalInteger(value: unknown, label: string) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a whole number greater than or equal to zero.`);
  }

  return parsed;
}

function normalizeOptionalFloat(value: unknown, label: string) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a number greater than or equal to zero.`);
  }

  return parsed;
}

export function sanitizeCompanyProfileSettings(
  input: CompanyProfileSettingsInput
): SanitizedCompanyProfileSettings {
  return {
    name: normalizeRequiredText(input.name, 'Company name', 160),
    industry: normalizeOptionalText(input.industry, 160),
    headquarters: normalizeOptionalText(input.headquarters, 160),
    employeeCount: normalizeOptionalInteger(input.employeeCount, 'Employee count'),
    annualRevenue: normalizeOptionalFloat(input.annualRevenue, 'Annual revenue'),
  };
}
