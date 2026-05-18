import type { EmissionScope, SourceType } from '../types';

export const DEFAULT_EMISSION_FACTOR_YEAR = 2025;
export const DEFAULT_GWP_BASIS = 'AR5 (100-year)';

export type EmissionFactorSourceFamily = 'EPA' | 'SUPPLEMENTAL' | 'DEFRA' | 'EGRID' | 'CUSTOM';

export interface EmissionFactorLibraryRecord {
  sourceType: SourceType;
  activityUnit: string;
  factor: number;
  factorUnit: string;
  scope: EmissionScope;
  region?: string;
  year: number;
  source: string;
  sourceFamily: EmissionFactorSourceFamily;
  methodology: string;
  gwpBasis: string;
  description: string;
  preferred?: boolean;
}

export interface LedgerFactorProvenance {
  factorSource: string;
  factorSourceFamily: string;
  factorYear: number;
  factorRegion: string | null;
  factorMethodology: string;
  factorGwpBasis: string;
  factorDescription: string;
}

export interface LedgerFactorOverrideInput {
  emissionFactor: number;
  reason: string;
  source?: string;
  year?: number;
  methodology?: string;
  description?: string;
  gwpBasis?: string;
}

const EPA_2025_EMISSION_FACTORS: EmissionFactorLibraryRecord[] = [
  {
    sourceType: 'electricity',
    activityUnit: 'kWh',
    factor: 0.352,
    factorUnit: 'kg CO2e/kWh',
    scope: 'Scope 2',
    region: 'US Average',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'US average grid electricity, location-based default',
    preferred: true,
  },
  {
    sourceType: 'electricity',
    activityUnit: 'MWh',
    factor: 351.63,
    factorUnit: 'kg CO2e/MWh',
    scope: 'Scope 2',
    region: 'US Average',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'US average grid electricity, location-based default',
  },
  {
    sourceType: 'electricity',
    activityUnit: 'kWh',
    factor: 0.199,
    factorUnit: 'kg CO2e/kWh',
    scope: 'Scope 2',
    region: 'California',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'California grid electricity, location-based default',
  },
  {
    sourceType: 'gas',
    activityUnit: 'therm',
    factor: 5.31,
    factorUnit: 'kg CO2e/therm',
    scope: 'Scope 1',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Natural gas combustion',
    preferred: true,
  },
  {
    sourceType: 'gas',
    activityUnit: 'MMBtu',
    factor: 53.11,
    factorUnit: 'kg CO2e/MMBtu',
    scope: 'Scope 1',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Natural gas combustion',
  },
  {
    sourceType: 'gas',
    activityUnit: 'm³',
    factor: 1.95,
    factorUnit: 'kg CO2e/m³',
    scope: 'Scope 1',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Natural gas combustion',
  },
  {
    sourceType: 'gas',
    activityUnit: 'cubic feet',
    factor: 0.055,
    factorUnit: 'kg CO2e/cubic foot',
    scope: 'Scope 1',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Natural gas combustion',
  },
  {
    sourceType: 'travel',
    activityUnit: 'km (car)',
    factor: 0.186,
    factorUnit: 'kg CO2e/km',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Average passenger vehicle business travel',
    preferred: true,
  },
  {
    sourceType: 'travel',
    activityUnit: 'miles (car)',
    factor: 0.299,
    factorUnit: 'kg CO2e/mile',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Average passenger vehicle business travel',
  },
  {
    sourceType: 'travel',
    activityUnit: 'km (flight)',
    factor: 0.13,
    factorUnit: 'kg CO2e/km',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Short-haul flight economy business travel',
    preferred: true,
  },
  {
    sourceType: 'travel',
    activityUnit: 'miles (flight)',
    factor: 0.209,
    factorUnit: 'kg CO2e/mile',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Short-haul flight economy business travel',
  },
  {
    sourceType: 'shipping',
    activityUnit: 'tonne-km',
    factor: 0.128,
    factorUnit: 'kg CO2e/tonne-km',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Truck freight average',
    preferred: true,
  },
  {
    sourceType: 'shipping',
    activityUnit: 'kg-km',
    factor: 0.000128,
    factorUnit: 'kg CO2e/kg-km',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Truck freight average',
  },
  {
    sourceType: 'shipping',
    activityUnit: 'tonne-km (air)',
    factor: 0.75,
    factorUnit: 'kg CO2e/tonne-km',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'EPA GHG Emission Factors Hub',
    sourceFamily: 'EPA',
    methodology: 'EPA_GHG_EMISSION_FACTORS_HUB_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Air freight average',
  },
];

const SUPPLEMENTAL_EMISSION_FACTORS: EmissionFactorLibraryRecord[] = [
  {
    sourceType: 'electricity',
    activityUnit: 'kWh',
    factor: 0.198,
    factorUnit: 'kg CO2e/kWh',
    scope: 'Scope 2',
    region: 'EU Average',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom supplemental regional default',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'SUPPLEMENTAL_DEFAULTS_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Supplemental European average electricity factor',
  },
  {
    sourceType: 'travel',
    activityUnit: 'km (train)',
    factor: 0.041,
    factorUnit: 'kg CO2e/km',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom supplemental mobility default',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'SUPPLEMENTAL_DEFAULTS_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Supplemental rail travel factor',
  },
  {
    sourceType: 'travel',
    activityUnit: 'km (bus)',
    factor: 0.089,
    factorUnit: 'kg CO2e/km',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom supplemental mobility default',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'SUPPLEMENTAL_DEFAULTS_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Supplemental bus travel factor',
  },
  {
    sourceType: 'shipping',
    activityUnit: 'tonne-km (sea)',
    factor: 0.016,
    factorUnit: 'kg CO2e/tonne-km',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom supplemental freight default',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'SUPPLEMENTAL_DEFAULTS_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Supplemental sea freight factor',
  },
  {
    sourceType: 'waste',
    activityUnit: 'kg (landfill)',
    factor: 0.586,
    factorUnit: 'kg CO2e/kg',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom supplemental waste default',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'SUPPLEMENTAL_DEFAULTS_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Supplemental mixed waste to landfill factor',
    preferred: true,
  },
  {
    sourceType: 'waste',
    activityUnit: 'kg (recycled)',
    factor: 0.021,
    factorUnit: 'kg CO2e/kg',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom supplemental waste default',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'SUPPLEMENTAL_DEFAULTS_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Supplemental recycled material factor',
  },
  {
    sourceType: 'waste',
    activityUnit: 'kg (composted)',
    factor: 0.044,
    factorUnit: 'kg CO2e/kg',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom supplemental waste default',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'SUPPLEMENTAL_DEFAULTS_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Supplemental composted organic waste factor',
  },
  {
    sourceType: 'waste',
    activityUnit: 'kg (incinerated)',
    factor: 0.986,
    factorUnit: 'kg CO2e/kg',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom supplemental waste default',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'SUPPLEMENTAL_DEFAULTS_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Supplemental incinerated waste factor',
  },
  {
    sourceType: 'water',
    activityUnit: 'm³',
    factor: 0.344,
    factorUnit: 'kg CO2e/m³',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom supplemental water default',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'SUPPLEMENTAL_DEFAULTS_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Supplemental water supply and treatment factor',
    preferred: true,
  },
  {
    sourceType: 'water',
    activityUnit: 'gallons',
    factor: 0.0013,
    factorUnit: 'kg CO2e/gallon',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom supplemental water default',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'SUPPLEMENTAL_DEFAULTS_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Supplemental water supply and treatment factor',
  },
  {
    sourceType: 'water',
    activityUnit: 'liters',
    factor: 0.000344,
    factorUnit: 'kg CO2e/liter',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom supplemental water default',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'SUPPLEMENTAL_DEFAULTS_2025',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Supplemental water supply and treatment factor',
  },
  {
    sourceType: 'other',
    activityUnit: 'kg CO2e',
    factor: 1,
    factorUnit: 'kg CO2e/kg CO2e',
    scope: 'Scope 3',
    year: DEFAULT_EMISSION_FACTOR_YEAR,
    source: 'Eco-Loom direct CO2e passthrough',
    sourceFamily: 'SUPPLEMENTAL',
    methodology: 'DIRECT_CO2E_PASSTHROUGH',
    gwpBasis: DEFAULT_GWP_BASIS,
    description: 'Direct CO2e passthrough value',
    preferred: true,
  },
];

const UNIT_ALIASES: Record<string, string> = {
  therms: 'therm',
  gallon: 'gallons',
  liter: 'liters',
  litre: 'liters',
};

export const EMISSION_FACTOR_LIBRARY: EmissionFactorLibraryRecord[] = [
  ...EPA_2025_EMISSION_FACTORS,
  ...SUPPLEMENTAL_EMISSION_FACTORS,
];

export function normalizeEmissionFactorUnit(unit: string) {
  const normalized = unit.trim();
  return UNIT_ALIASES[normalized.toLowerCase()] ?? normalized;
}

function rankFactor(record: EmissionFactorLibraryRecord) {
  return `${record.sourceFamily === 'EPA' ? '0' : '1'}:${record.preferred ? '0' : '1'}:${record.region ? '0' : '1'}`;
}

export function getEmissionFactorsBySourceType(
  sourceType: SourceType,
  options?: {
    includeSupplemental?: boolean;
  }
) {
  const includeSupplemental = options?.includeSupplemental ?? true;
  return EMISSION_FACTOR_LIBRARY
    .filter(
      (record) =>
        record.sourceType === sourceType &&
        (includeSupplemental || record.sourceFamily === 'EPA')
    )
    .sort((a, b) => rankFactor(a).localeCompare(rankFactor(b)));
}

export function getEmissionFactor(
  sourceType: SourceType,
  unit: string,
  options?: {
    region?: string;
    year?: number;
    includeSupplemental?: boolean;
  }
) {
  const year = options?.year ?? DEFAULT_EMISSION_FACTOR_YEAR;
  const region = options?.region?.trim();
  const normalizedUnit = normalizeEmissionFactorUnit(unit);

  const candidates = getEmissionFactorsBySourceType(sourceType, {
    includeSupplemental: options?.includeSupplemental,
  }).filter(
    (record) =>
      normalizeEmissionFactorUnit(record.activityUnit) === normalizedUnit &&
      record.year === year
  );

  if (candidates.length === 0) {
    return undefined;
  }

  if (region) {
    const regionMatch = candidates.find((record) => record.region === region);
    if (regionMatch) {
      return regionMatch;
    }
  }

  return candidates.find((record) => record.preferred) ?? candidates[0];
}

export function getRequiredEmissionFactor(
  sourceType: SourceType,
  unit: string,
  options?: {
    region?: string;
    year?: number;
    includeSupplemental?: boolean;
  }
) {
  const factor = getEmissionFactor(sourceType, unit, options);

  if (!factor) {
    throw new Error(
      `No approved emission factor found for source type "${sourceType}" and unit "${unit}"`
    );
  }

  return factor;
}

export function factorRecordMatchesValue(
  record: EmissionFactorLibraryRecord,
  factor: number,
  tolerance = 0.0005
) {
  return Math.abs(record.factor - factor) <= tolerance;
}

export function resolveApprovedEmissionFactor(
  sourceType: SourceType,
  unit: string,
  options?: {
    region?: string;
    year?: number;
    includeSupplemental?: boolean;
    factor?: number;
  }
) {
  const record = getEmissionFactor(sourceType, unit, options);
  if (!record) {
    return undefined;
  }

  if (typeof options?.factor === 'number' && !factorRecordMatchesValue(record, options.factor)) {
    return undefined;
  }

  return record;
}

export function buildEmissionFactorRecordKey(record: {
  sourceType: string;
  activityUnit: string;
  year: number;
  region?: string | null;
}) {
  return [
    record.sourceType,
    normalizeEmissionFactorUnit(record.activityUnit),
    record.region ?? '__default__',
    String(record.year),
  ].join('::');
}

export function buildLedgerFactorProvenance(
  record: EmissionFactorLibraryRecord
): LedgerFactorProvenance {
  return {
    factorSource: record.source,
    factorSourceFamily: record.sourceFamily,
    factorYear: record.year,
    factorRegion: record.region ?? null,
    factorMethodology: record.methodology,
    factorGwpBasis: record.gwpBasis,
    factorDescription: record.description,
  };
}

export function calculateCo2Equivalent(
  sourceType: SourceType,
  activityValue: number,
  unit: string,
  options?: {
    region?: string;
    year?: number;
    includeSupplemental?: boolean;
  }
): { co2Equivalent: number; scope: EmissionScope; factor: number } | null {
  const factor = getEmissionFactor(sourceType, unit, options);
  if (!factor) {
    return null;
  }

  return {
    co2Equivalent: activityValue * factor.factor,
    scope: factor.scope,
    factor: factor.factor,
  };
}

export function getAvailableUnits(
  sourceType: SourceType,
  options?: {
    includeSupplemental?: boolean;
  }
) {
  return getEmissionFactorsBySourceType(sourceType, options).map((record) => record.activityUnit);
}

export function buildEmissionFactorSeedData() {
  return EMISSION_FACTOR_LIBRARY.map((factor) => ({
    sourceType: factor.sourceType,
    activityUnit: factor.activityUnit,
    factor: factor.factor,
    factorUnit: factor.factorUnit,
    region: factor.region,
    year: factor.year,
    source: factor.source,
    sourceFamily: factor.sourceFamily,
    methodology: factor.methodology,
    gwpBasis: factor.gwpBasis,
    description: factor.description,
  }));
}
