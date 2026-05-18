import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';
import { getAuditFeedMessage, getAuditFeature, getAuditStatus } from '@/lib/audit';
import type { ActivityFeedItem } from '@/lib/types';

function formatSourceTypeLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function parseBoundaryDepartments(raw: string | null | undefined) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is { name?: string | null; code?: string | null } =>
        !!item && typeof item === 'object'
    );
  } catch {
    return [];
  }
}

function reportMatchesFacility(
  report: {
    title: string;
    boundarySummary: string | null;
    boundaryDepartments: string | null;
  },
  selectedDepartment: { name: string; code: string | null }
) {
  const normalizedTitle = report.title.toLowerCase();
  const normalizedBoundarySummary = report.boundarySummary?.toLowerCase() || '';
  const normalizedDepartmentName = selectedDepartment.name.toLowerCase();
  const normalizedDepartmentCode = selectedDepartment.code?.toLowerCase() || null;
  const boundaryDepartments = parseBoundaryDepartments(report.boundaryDepartments);
  if (
    boundaryDepartments.some(
      (department) =>
        department.name?.toLowerCase() === normalizedDepartmentName ||
        (department.code?.toLowerCase() &&
          department.code.toLowerCase() === normalizedDepartmentCode)
    )
  ) {
    return true;
  }

  return (
    normalizedTitle.includes(normalizedDepartmentName) ||
    normalizedBoundarySummary.includes(normalizedDepartmentName) ||
    (normalizedDepartmentCode
      ? normalizedTitle.includes(normalizedDepartmentCode) ||
        normalizedBoundarySummary.includes(normalizedDepartmentCode)
      : false)
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const departmentId = searchParams.get('departmentId');
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const companyError = assertCompanyAccess(auth.session, companyId);
  if (companyError) {
    return companyError;
  }

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 25) : 10;

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
            code: true,
          },
        })
      : null;

    if (auth.session.role === 'admin' && !selectedDepartment) {
      const logs = await db.auditLog.findMany({
        where: {
          user: {
            is: {
              companyId: companyId!,
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      });

      const activityFeed: ActivityFeedItem[] = logs.map((log) => ({
        id: log.id,
        feature: getAuditFeature(log.entityType),
        action: log.action,
        message: getAuditFeedMessage(log),
        timestamp: log.createdAt.toISOString(),
        status: getAuditStatus(log.action),
        entityType: log.entityType,
        entityId: log.entityId,
      }));

      return NextResponse.json(activityFeed);
    }

    const queryLimit = Math.max(safeLimit * 2, 12);
    const [recentCreatedEntries, recentVerifiedEntries, recentGoals, recentReports] =
      await Promise.all([
        db.carbonLedgerEntry.findMany({
          where: {
            companyId: companyId!,
            ...(selectedDepartment ? { departmentId: selectedDepartment.id } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: queryLimit,
          include: { department: true },
        }),
        db.carbonLedgerEntry.findMany({
          where: {
            companyId: companyId!,
            verified: true,
            verifiedAt: { not: null },
            ...(selectedDepartment ? { departmentId: selectedDepartment.id } : {}),
          },
          orderBy: { verifiedAt: 'desc' },
          take: queryLimit,
          include: { department: true },
        }),
        db.sustainabilityGoal.findMany({
          where: selectedDepartment
            ? {
                companyId: companyId!,
                OR: [{ departmentId: selectedDepartment.id }, { departmentId: null }],
              }
            : { companyId: companyId! },
          orderBy: { updatedAt: 'desc' },
          take: queryLimit,
          include: { department: true },
        }),
        db.report.findMany({
          where: { companyId: companyId! },
          orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }],
          take: queryLimit,
        }),
      ]);

    const activityFeed: ActivityFeedItem[] = [];

    for (const entry of recentVerifiedEntries) {
      activityFeed.push({
        id: `verify-${entry.id}-${entry.verifiedAt?.toISOString() || entry.updatedAt.toISOString()}`,
        feature: 'ledger',
        action: 'verify',
        message: `${formatSourceTypeLabel(entry.sourceType)} entry verified for ${entry.department?.name || 'Unknown facility'} • ${entry.activityValue} ${entry.activityUnit}`,
        timestamp: entry.verifiedAt?.toISOString() || entry.updatedAt.toISOString(),
        status: 'success',
        entityType: 'carbon_ledger_entry',
        entityId: entry.id,
      });
    }

    for (const entry of recentCreatedEntries) {
      activityFeed.push({
        id: `create-${entry.id}-${entry.createdAt.toISOString()}`,
        feature: 'ledger',
        action: 'create',
        message: `${formatSourceTypeLabel(entry.sourceType)} data added for ${entry.department?.name || 'Unknown facility'} • ${entry.activityValue} ${entry.activityUnit}`,
        timestamp: entry.createdAt.toISOString(),
        status: entry.verified ? 'success' : 'pending',
        entityType: 'carbon_ledger_entry',
        entityId: entry.id,
      });
    }

    for (const goal of recentGoals) {
      activityFeed.push({
        id: `goal-${goal.id}-${goal.updatedAt.toISOString()}`,
        feature: 'goals',
        action: 'update',
        message: `${goal.title} updated for ${goal.department?.name || 'Company-wide'} • ${goal.progressPercent.toFixed(1)}% progress`,
        timestamp: goal.updatedAt.toISOString(),
        status: goal.status === 'at_risk' ? 'warning' : goal.status === 'achieved' ? 'success' : 'pending',
        entityType: 'sustainability_goal',
        entityId: goal.id,
      });
    }

    for (const report of recentReports.filter((item) =>
      selectedDepartment ? reportMatchesFacility(item, selectedDepartment) : true
    )) {
      const eventTimestamp = report.publishedAt ?? report.updatedAt ?? report.createdAt;
      activityFeed.push({
        id: `report-${report.id}-${eventTimestamp.toISOString()}`,
        feature: 'reports',
        action: report.status === 'published' ? 'publish' : 'create',
        message:
          report.status === 'published'
            ? `${report.title} published for stakeholder review`
            : `${report.title} drafted for review`,
        timestamp: eventTimestamp.toISOString(),
        status: report.status === 'published' ? 'success' : 'pending',
        entityType: 'report',
        entityId: report.id,
      });
    }

    activityFeed.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(activityFeed.slice(0, safeLimit));
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 });
  }
}
