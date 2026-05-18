import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getEffectiveCompanyId, requireApiSession } from '@/lib/server/auth';
import { sanitizeCompanyProfileSettings } from '@/lib/server/company-profile-settings';
import { sanitizeCompanyReportDefaults } from '@/lib/server/company-report-defaults';

async function buildCompanyResponse(companyId: string) {
  const [company, facilityCount] = await Promise.all([
    db.company.findUnique({
      where: { id: companyId },
    }),
    db.department.count({
      where: { companyId },
    }),
  ]);

  if (!company) {
    throw new Error('Company not found');
  }

  if (company.facilityCount !== facilityCount) {
    await db.company.update({
      where: { id: companyId },
      data: { facilityCount },
    });
  }

  return {
    ...company,
    facilityCount,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const company = await buildCompanyResponse(getEffectiveCompanyId(auth.session));

    return NextResponse.json([company]);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const companyId = getEffectiveCompanyId(auth.session);
    const existingCompany = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!existingCompany) {
      throw new Error('Company not found');
    }

    const defaults = sanitizeCompanyReportDefaults({
      defaultReportMode: body.defaultReportMode ?? existingCompany.defaultReportMode,
      defaultReportingStandard:
        body.defaultReportingStandard ?? existingCompany.defaultReportingStandard,
      defaultGwpBasis: body.defaultGwpBasis ?? existingCompany.defaultGwpBasis,
      defaultFactorSourcePolicy:
        body.defaultFactorSourcePolicy ?? existingCompany.defaultFactorSourcePolicy,
      defaultOverridePolicy: body.defaultOverridePolicy ?? existingCompany.defaultOverridePolicy,
      defaultReportOwnerName:
        body.defaultReportOwnerName ?? existingCompany.defaultReportOwnerName,
      defaultReportOwnerEmail:
        body.defaultReportOwnerEmail ?? existingCompany.defaultReportOwnerEmail,
      defaultReportReviewerIds:
        body.defaultReportReviewerIds ?? existingCompany.defaultReportReviewerIds,
      defaultReportRecipients:
        body.defaultReportRecipients ?? existingCompany.defaultReportRecipients,
      defaultApprovalWorkflow:
        body.defaultApprovalWorkflow ?? existingCompany.defaultApprovalWorkflow,
      defaultOrganizationalBoundaryMethod:
        body.defaultOrganizationalBoundaryMethod ??
        existingCompany.defaultOrganizationalBoundaryMethod,
      defaultOrganizationalBoundaryNotes:
        body.defaultOrganizationalBoundaryNotes ??
        existingCompany.defaultOrganizationalBoundaryNotes,
      defaultBaseYear: body.defaultBaseYear ?? existingCompany.defaultBaseYear,
      defaultBaseYearNotes: body.defaultBaseYearNotes ?? existingCompany.defaultBaseYearNotes,
      defaultBaseYearRecalculationPolicy:
        body.defaultBaseYearRecalculationPolicy ??
        existingCompany.defaultBaseYearRecalculationPolicy,
      defaultScope2Method: body.defaultScope2Method ?? existingCompany.defaultScope2Method,
      defaultScope2MarketBasedEmissions:
        body.defaultScope2MarketBasedEmissions ??
        existingCompany.defaultScope2MarketBasedEmissions,
      defaultScope2DisclosureNotes:
        body.defaultScope2DisclosureNotes ?? existingCompany.defaultScope2DisclosureNotes,
      defaultScope2InstrumentNotes:
        body.defaultScope2InstrumentNotes ?? existingCompany.defaultScope2InstrumentNotes,
      annualDisclosureNotes:
        body.annualDisclosureNotes ?? existingCompany.annualDisclosureNotes,
    });
    const profile = sanitizeCompanyProfileSettings({
      name: body.name ?? existingCompany.name,
      industry: body.industry ?? existingCompany.industry,
      headquarters: body.headquarters ?? existingCompany.headquarters,
      employeeCount: body.employeeCount ?? existingCompany.employeeCount,
      annualRevenue: body.annualRevenue ?? existingCompany.annualRevenue,
    });

    const reviewerIds = defaults.defaultReportReviewerIds
      ? JSON.parse(defaults.defaultReportReviewerIds)
      : [];
    const validReviewers =
      reviewerIds.length > 0
        ? await db.user.findMany({
            where: {
              id: { in: reviewerIds },
              companyId,
              status: 'active',
            },
            select: {
              id: true,
              email: true,
            },
          })
        : [];

    const canonicalReviewerIds = validReviewers.map((reviewer) => reviewer.id);
    const canonicalRecipients =
      validReviewers.length > 0
        ? validReviewers.map((reviewer) => reviewer.email).join(', ')
        : defaults.defaultReportRecipients;

    await db.company.update({
      where: { id: companyId },
      data: {
        name: profile.name,
        industry: profile.industry,
        headquarters: profile.headquarters,
        employeeCount: profile.employeeCount,
        annualRevenue: profile.annualRevenue,
        defaultReportMode: defaults.defaultReportMode,
        defaultReportingStandard: defaults.defaultReportingStandard,
        defaultGwpBasis: defaults.defaultGwpBasis,
        defaultFactorSourcePolicy: defaults.defaultFactorSourcePolicy,
        defaultOverridePolicy: defaults.defaultOverridePolicy,
        defaultReportOwnerName: defaults.defaultReportOwnerName,
        defaultReportOwnerEmail: defaults.defaultReportOwnerEmail,
        defaultReportReviewerIds:
          canonicalReviewerIds.length > 0 ? JSON.stringify(canonicalReviewerIds) : null,
        defaultReportRecipients: canonicalRecipients,
        defaultApprovalWorkflow: defaults.defaultApprovalWorkflow,
        defaultOrganizationalBoundaryMethod: defaults.defaultOrganizationalBoundaryMethod,
        defaultOrganizationalBoundaryNotes: defaults.defaultOrganizationalBoundaryNotes,
        defaultBaseYear: defaults.defaultBaseYear,
        defaultBaseYearNotes: defaults.defaultBaseYearNotes,
        defaultBaseYearRecalculationPolicy: defaults.defaultBaseYearRecalculationPolicy,
        defaultScope2Method: defaults.defaultScope2Method,
        defaultScope2MarketBasedEmissions: defaults.defaultScope2MarketBasedEmissions,
        defaultScope2DisclosureNotes: defaults.defaultScope2DisclosureNotes,
        defaultScope2InstrumentNotes: defaults.defaultScope2InstrumentNotes,
        annualDisclosureNotes: defaults.annualDisclosureNotes,
      },
    });

    const updatedCompany = await buildCompanyResponse(companyId);
    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error('Error updating company defaults:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update company defaults' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}
