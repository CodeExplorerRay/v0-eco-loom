import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type Co2eDisplayOptions = {
  fallback?: string
  maximumFractionDigits?: number
  minimumFractionDigits?: number
  unitStyle?: 'full' | 'short'
}

type Co2eDisplay = {
  formatted: string
  formattedValue: string
  rawValue: number | null
  scaledValue: number | null
  unit: string | null
}

export function getCo2eDisplay(
  value: number | null | undefined,
  options: Co2eDisplayOptions = {}
): Co2eDisplay {
  const {
    fallback = 'N/A',
    maximumFractionDigits = 2,
    minimumFractionDigits = 2,
    unitStyle = 'full',
  } = options

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return {
      formatted: fallback,
      formattedValue: fallback,
      rawValue: null,
      scaledValue: null,
      unit: null,
    }
  }

  const useMetricTons = Math.abs(value) >= 1000
  const scaledValue = useMetricTons ? value / 1000 : value
  const formattedValue = new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(scaledValue)
  const unit = useMetricTons ? 'tCO2e' : unitStyle === 'short' ? 'kg' : 'kg CO2e'

  return {
    formatted: `${formattedValue} ${unit}`,
    formattedValue,
    rawValue: value,
    scaledValue,
    unit,
  }
}

export function formatCo2e(
  value: number | null | undefined,
  options?: Co2eDisplayOptions
) {
  return getCo2eDisplay(value, options).formatted
}

export function formatCompactCo2e(
  value: number | null | undefined,
  options: Omit<Co2eDisplayOptions, 'unitStyle'> = {}
) {
  return formatCo2e(value, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    unitStyle: 'short',
    ...options,
  })
}

export function escapeHtml(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
