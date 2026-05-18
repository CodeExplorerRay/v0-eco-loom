import { db } from '@/lib/db';
import {
  DEFAULT_GWP_BASIS,
  buildLedgerFactorProvenance,
  getEmissionFactor,
  getRequiredEmissionFactor,
  type LedgerFactorOverrideInput,
} from '@/lib/emissions/factor-service';
import type { SourceType } from '@/lib/types';

type ApprovedLedgerCalculationOptions = {
  sourceType: SourceType;
  activityUnit: string;
  activityValue: number;
  region?: string;
  year?: number;
  factorOverride?: LedgerFactorOverrideInput | null;
};

export async function resolveApprovedLedgerCalculation({
  sourceType,
  activityUnit,
  activityValue,
  region,
  year,
  factorOverride,
}: ApprovedLedgerCalculationOptions) {
  if (factorOverride) {
    const matchedFactor = getEmissionFactor(sourceType, activityUnit, {
      region,
      year,
      includeSupplemental: true,
    });

    return {
      approvedFactor: matchedFactor ?? null,
      factorRecord: null,
      category: matchedFactor?.scope ?? 'Scope 3',
      emissionFactor: factorOverride.emissionFactor,
      emissionFactorUnit: `kg CO2e/${activityUnit}`,
      co2Equivalent: activityValue * factorOverride.emissionFactor,
      factorProvenance: {
        factorSource: factorOverride.source?.trim() || 'Admin Override',
        factorSourceFamily: 'CUSTOM',
        factorYear: factorOverride.year ?? year ?? new Date().getUTCFullYear(),
        factorRegion: region ?? matchedFactor?.region ?? null,
        factorMethodology: factorOverride.methodology?.trim() || 'ADMIN_OVERRIDE',
        factorGwpBasis: factorOverride.gwpBasis?.trim() || DEFAULT_GWP_BASIS,
        factorDescription:
          factorOverride.description?.trim() ||
          `Admin-approved factor override for ${sourceType}`,
      },
    };
  }

  const approvedFactor = getRequiredEmissionFactor(sourceType, activityUnit, {
    region,
    year,
  });
  const factorRecord = await db.emissionFactor.findFirst({
    where: {
      sourceType: approvedFactor.sourceType,
      activityUnit: approvedFactor.activityUnit,
      year: approvedFactor.year,
      region: approvedFactor.region ?? null,
    },
  });

  return {
    approvedFactor,
    factorRecord,
    category: approvedFactor.scope,
    emissionFactor: approvedFactor.factor,
    emissionFactorUnit: approvedFactor.factorUnit,
    co2Equivalent: activityValue * approvedFactor.factor,
    factorProvenance: buildLedgerFactorProvenance(approvedFactor),
  };
}
