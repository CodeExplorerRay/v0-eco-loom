// Legacy compatibility wrapper around the shared emission factor service.
// Prefer importing from '@/lib/emissions/factor-service' for new code.

import type { EmissionScope, SourceType } from '@/lib/types';
import {
  buildEmissionFactorSeedData,
  calculateCo2Equivalent,
  DEFAULT_EMISSION_FACTOR_YEAR,
  getAvailableUnits,
  getEmissionFactor,
  getEmissionFactorsBySourceType,
} from '@/lib/emissions/factor-service';

export interface EmissionFactorData {
  sourceType: SourceType;
  activityUnit: string;
  factor: number;
  factorUnit: string;
  scope: EmissionScope;
  region?: string;
  description: string;
}

export const EPA_EMISSION_FACTORS: EmissionFactorData[] = buildEmissionFactorSeedData()
  .filter((factor) => factor.year === DEFAULT_EMISSION_FACTOR_YEAR)
  .map((factor) => {
    const record = getEmissionFactor(factor.sourceType, factor.activityUnit, {
      region: factor.region,
      year: factor.year,
      includeSupplemental: true,
    });

    return {
      sourceType: factor.sourceType,
      activityUnit: factor.activityUnit,
      factor: factor.factor,
      factorUnit: factor.factorUnit,
      scope: record?.scope ?? 'Scope 3',
      region: factor.region ?? undefined,
      description: record?.description ?? factor.source,
    };
  });

export {
  calculateCo2Equivalent,
  getAvailableUnits,
  getEmissionFactor,
  getEmissionFactorsBySourceType,
};
