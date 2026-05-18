import { db } from '@/lib/db';

const FACILITY_REPORT_PREFIX = 'Facility-specific report for ';

type FacilitySummaryInput = {
  name: string;
  code?: string | null;
};

export function buildFacilityScopedBoundarySummary(
  facility: FacilitySummaryInput,
  defaultSummary: string
) {
  const facilityLabel = facility.code ? `${facility.name} (${facility.code})` : facility.name;
  return `${FACILITY_REPORT_PREFIX}${facilityLabel}. ${defaultSummary}`;
}

export async function resolveReportDepartmentScope(input: {
  companyId: string;
  boundarySummary?: string | null;
}) {
  const boundarySummary = input.boundarySummary?.trim();
  if (!boundarySummary || !boundarySummary.startsWith(FACILITY_REPORT_PREFIX)) {
    return null;
  }

  const facilitySegment = boundarySummary
    .slice(FACILITY_REPORT_PREFIX.length)
    .split('.')[0]
    ?.trim();

  if (!facilitySegment) {
    return null;
  }

  const codeMatch = facilitySegment.match(/\(([^)]+)\)\s*$/);
  const code = codeMatch?.[1]?.trim() || null;
  const name = facilitySegment.replace(/\s*\([^)]+\)\s*$/, '').trim();

  return db.department.findFirst({
    where: {
      companyId: input.companyId,
      ...(code ? { code } : { name }),
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });
}

export function buildFacilityScopedReportTitle(title: string, facility: FacilitySummaryInput) {
  return `${title} - ${facility.name}`;
}
