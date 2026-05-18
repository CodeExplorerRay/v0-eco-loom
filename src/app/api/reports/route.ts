import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';

const REPORTS_PAGE_SIZE = 20;
const ALLOWED_REPORT_STATUSES = new Set(['draft', 'published', 'archived']);
const ALLOWED_APPROVAL_STATUSES = new Set(['pending_review', 'approved']);

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const departmentId = searchParams.get('departmentId');
  const status = searchParams.get('status');
  const approvalStatus = searchParams.get('approvalStatus');
  const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const requestedPageSize = Number.parseInt(
    searchParams.get('pageSize') || String(REPORTS_PAGE_SIZE),
    10
  );
  const companyError = assertCompanyAccess(auth.session, companyId);
  if (companyError) {
    return companyError;
  }

  try {
    const selectedDepartment = departmentId
      ? await db.department.findFirst({
          where: {
            id: departmentId,
            companyId: companyId!,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : null;
    if (departmentId && !selectedDepartment) {
      return NextResponse.json({ error: 'Facility / site not found' }, { status: 404 });
    }
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize =
      Number.isFinite(requestedPageSize) && requestedPageSize > 0
        ? Math.max(requestedPageSize, REPORTS_PAGE_SIZE)
        : REPORTS_PAGE_SIZE;
    const activeStatus =
      status && ALLOWED_REPORT_STATUSES.has(status) ? status : null;
    const activeApprovalStatus =
      approvalStatus && ALLOWED_APPROVAL_STATUSES.has(approvalStatus) ? approvalStatus : null;
    const scopedWhere: Prisma.ReportWhereInput = {
      companyId: companyId!,
      ...(selectedDepartment
        ? {
            boundarySummary: {
              contains: `Facility-specific report for ${selectedDepartment.name}`,
            },
          }
        : {}),
    };
    const where: Prisma.ReportWhereInput = {
      ...scopedWhere,
      ...(activeStatus ? { status: activeStatus } : {}),
      ...(activeApprovalStatus ? { approvalStatus: activeApprovalStatus } : {}),
    };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [total, reports, totalReports, publishedCount, draftCount, archivedCount, thisMonthCount] =
      await Promise.all([
        db.report.count({ where }),
        db.report.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.report.count({ where: scopedWhere }),
        db.report.count({ where: { ...scopedWhere, status: 'published' } }),
        db.report.count({ where: { ...scopedWhere, status: 'draft' } }),
        db.report.count({ where: { ...scopedWhere, status: 'archived' } }),
        db.report.count({
          where: {
            ...scopedWhere,
            createdAt: {
              gte: startOfMonth,
              lt: startOfNextMonth,
            },
          },
        }),
      ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    const pageReports =
      safePage === page
        ? reports
        : await db.report.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (safePage - 1) * pageSize,
            take: pageSize,
          });

    return NextResponse.json({
      data: pageReports,
      total,
      page: safePage,
      pageSize,
      totalPages,
      counts: {
        total: totalReports,
        published: publishedCount,
        draft: draftCount,
        archived: archivedCount,
        thisMonth: thisMonthCount,
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
