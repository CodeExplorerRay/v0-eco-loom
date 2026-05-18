import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';
import { getReportAnalytics } from '@/lib/server/report-analytics';
import { buildReportAppendices } from '@/lib/server/report-appendices';
import {
  buildAppendixDisclosureContext,
  buildEffectiveReportDisclosure,
} from '@/lib/server/report-disclosure';
import {
  buildPublicationBlockerMessage,
  getBlockingPublicationIssues,
} from '@/lib/server/report-publication';
import { getReportLedgerEvidence } from '@/lib/server/report-exports';
import { getReportFactorProvenance } from '@/lib/server/report-provenance';
import { resolveReportDepartmentScope } from '@/lib/server/report-scope';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const existingReport = await db.report.findUnique({
      where: { id },
    });

    if (!existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const companyError = assertCompanyAccess(auth.session, existingReport.companyId);
    if (companyError) {
      return companyError;
    }

    const reportDepartment = await resolveReportDepartmentScope({
      companyId: existingReport.companyId,
      boundarySummary: existingReport.boundarySummary,
    });
    const [factorProvenance, reportAnalytics, ledgerEvidence, company] = await Promise.all([
      getReportFactorProvenance(
        existingReport.companyId,
        existingReport.reportingPeriod,
        reportDepartment?.id
      ),
      getReportAnalytics(
        existingReport.companyId,
        existingReport.reportingPeriod,
        reportDepartment?.id
      ),
      getReportLedgerEvidence(
        existingReport.companyId,
        existingReport.reportingPeriod,
        reportDepartment?.id
      ),
      db.company.findUnique({ where: { id: existingReport.companyId } }),
    ]);
    const { methodologyMetadata, boundaryMetadata } = buildEffectiveReportDisclosure({
      report: existingReport,
      company,
      entries: ledgerEvidence,
      factorProvenanceSummary: factorProvenance.summaryText,
    });
    const appendices = buildReportAppendices(
      buildAppendixDisclosureContext(existingReport, methodologyMetadata, boundaryMetadata),
      ledgerEvidence,
      factorProvenance,
      reportAnalytics
    );
    const blockingIssues = getBlockingPublicationIssues(
      existingReport.reportMode,
      appendices.unresolvedQualityIssues
    );

    if (blockingIssues.length > 0) {
      return NextResponse.json(
        {
          error: buildPublicationBlockerMessage(blockingIssues),
          issues: blockingIssues,
        },
        { status: 409 }
      );
    }

    const report = await db.report.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        approvalStatus: 'approved',
        approvedByName: auth.session.userName,
        approvedByEmail: auth.session.userEmail,
        approvedAt: new Date(),
      },
    });

    await createAuditLog(auth.session, {
      action: 'publish',
      entityType: 'report',
      entityId: id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        approvalStatus: 'approved',
        approvedByName: auth.session.userName,
        approvedByEmail: auth.session.userEmail,
        reportRecipients: report.reportRecipients || null,
        approvalWorkflow: report.approvalWorkflow || null,
      }),
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error publishing report:', error);
    return NextResponse.json({ error: 'Failed to publish report' }, { status: 500 });
  }
}
