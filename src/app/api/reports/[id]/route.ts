import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';
import { getReportFactorProvenance } from '@/lib/server/report-provenance';
import { getReportAnalytics } from '@/lib/server/report-analytics';
import { getReportLedgerEvidence, toSerializableReport } from '@/lib/server/report-exports';
import { resolveReportDepartmentScope } from '@/lib/server/report-scope';
import {
  buildAppendixDisclosureContext,
  buildEffectiveReportDisclosure,
} from '@/lib/server/report-disclosure';
import {
  buildReportAppendices,
  buildReportVerifierManifest,
} from '@/lib/server/report-appendices';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const report = await db.report.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const companyError = assertCompanyAccess(auth.session, report.companyId);
    if (companyError) {
      return companyError;
    }

    const reportDepartment = await resolveReportDepartmentScope({
      companyId: report.companyId,
      boundarySummary: report.boundarySummary,
    });
    const [factorProvenance, reportAnalytics, ledgerEvidence, company] = await Promise.all([
      getReportFactorProvenance(report.companyId, report.reportingPeriod, reportDepartment?.id),
      getReportAnalytics(report.companyId, report.reportingPeriod, reportDepartment?.id),
      getReportLedgerEvidence(report.companyId, report.reportingPeriod, reportDepartment?.id),
      db.company.findUnique({ where: { id: report.companyId } }),
    ]);
    const { methodologyMetadata, boundaryMetadata } = buildEffectiveReportDisclosure({
      report,
      company,
      entries: ledgerEvidence,
      factorProvenanceSummary: factorProvenance.summaryText,
    });

    const appendices = buildReportAppendices(
      buildAppendixDisclosureContext(report, methodologyMetadata, boundaryMetadata),
      ledgerEvidence,
      factorProvenance,
      reportAnalytics
    );
    const reportData = toSerializableReport(
      report,
      factorProvenance,
      reportAnalytics,
      appendices,
      undefined,
      { methodologyMetadata, boundaryMetadata }
    );
    const verifierManifest = buildReportVerifierManifest(reportData, appendices);

    return NextResponse.json(
      toSerializableReport(report, factorProvenance, reportAnalytics, appendices, verifierManifest, {
        methodologyMetadata,
        boundaryMetadata,
      })
    );
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}
