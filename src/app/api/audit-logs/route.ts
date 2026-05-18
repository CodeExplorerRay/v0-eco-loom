import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getEntityTypesForFeature } from '@/lib/audit';
import { requireApiSession } from '@/lib/server/auth';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getDateBoundary(value: string | null, endOfDay = false) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(DEFAULT_PAGE_SIZE, parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE))
  );
  const search = searchParams.get('search')?.trim() || '';
  const actor = searchParams.get('actor')?.trim() || '';
  const action = searchParams.get('action')?.trim() || '';
  const feature = searchParams.get('feature')?.trim() || '';
  const entityType = searchParams.get('entityType')?.trim() || '';
  const entityId = searchParams.get('entityId')?.trim() || '';
  const dateFrom = getDateBoundary(searchParams.get('dateFrom'));
  const dateTo = getDateBoundary(searchParams.get('dateTo'), true);

  const andClauses: Prisma.AuditLogWhereInput[] = [buildCompanyScopeClause(auth.session.companyId)];

  const where: Prisma.AuditLogWhereInput = {
    AND: andClauses,
  };

  if (action && action !== 'all') {
    andClauses.push({ action });
  }

  if (entityType) {
    andClauses.push({ entityType });
  }

  if (entityId) {
    andClauses.push({ entityId });
  }

  const featureEntityTypes = getEntityTypesForFeature(feature);
  if (featureEntityTypes) {
    andClauses.push({
      entityType: {
        in: featureEntityTypes,
      },
    });
  }

  if (dateFrom || dateTo) {
    andClauses.push({
      createdAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    });
  }

  if (search) {
    andClauses.push({
      OR: [
        { action: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { entityType: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { entityId: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { details: { contains: search, mode: Prisma.QueryMode.insensitive } },
        {
          user: {
            is: {
              name: { contains: search, mode: Prisma.QueryMode.insensitive },
            },
          },
        },
        {
          user: {
            is: {
              email: { contains: search, mode: Prisma.QueryMode.insensitive },
            },
          },
        },
      ],
    });
  }

  if (actor) {
    andClauses.push({
      OR: [
        {
          user: {
            is: {
              name: { contains: actor, mode: Prisma.QueryMode.insensitive },
            },
          },
        },
        {
          user: {
            is: {
              email: { contains: actor, mode: Prisma.QueryMode.insensitive },
            },
          },
        },
        {
          details: {
            contains: actor,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    });
  }

  try {
    const total = await db.auditLog.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      data: logs,
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

function buildCompanyScopeClause(companyId: string): Prisma.AuditLogWhereInput {
  return {
    OR: [
      {
        user: {
          is: {
            companyId,
          },
        },
      },
      {
        details: {
          contains: `"companyId":"${companyId}"`,
        },
      },
      {
        entityType: { in: ['database', 'goal'] },
        entityId: companyId,
      },
    ],
  };
}
