import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { FACILITY_TYPE_VALUES } from '@/lib/facility-blueprints';
import { createAuditLog } from '@/lib/server/audit';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const companyError = assertCompanyAccess(auth.session, companyId);
  if (companyError) {
    return companyError;
  }

  try {
    const departments = await db.$queryRaw<
      Array<{
        id: string;
        name: string;
        code: string;
        budget: number | null;
        locationDetail: string | null;
        address: string | null;
        country: string | null;
        facilityType: string | null;
        companyId: string;
        notionPageId: string | null;
        notionSyncedAt: Date | null;
        notionLastEditedAt: Date | null;
        notionLastEditor: string | null;
        notionSyncStatus: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        "id",
        "name",
        "code",
        "budget",
        "locationDetail",
        "address",
        "country",
        "facilityType",
        "companyId",
        "notionPageId",
        "notionSyncedAt",
        "notionLastEditedAt",
        "notionLastEditor",
        "notionSyncStatus",
        "createdAt",
        "updatedAt"
      FROM "public"."Department"
      WHERE "companyId" = ${companyId!}
      ORDER BY "name" ASC
    `);

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const companyId = typeof body.companyId === 'string' ? body.companyId : null;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const rawCode = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const locationDetail =
      typeof body.locationDetail === 'string' ? body.locationDetail.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const country = typeof body.country === 'string' ? body.country.trim() : '';
    const facilityType = typeof body.facilityType === 'string' ? body.facilityType.trim() : '';
    const budget =
      body.budget === null || body.budget === undefined || body.budget === ''
        ? null
        : Number.parseFloat(String(body.budget));

    const companyError = assertCompanyAccess(auth.session, companyId);
    if (companyError) {
      return companyError;
    }

    if (!companyId || !name || !rawCode) {
      return NextResponse.json(
        { error: 'Facility / site name, code, and company are required' },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9-]{2,16}$/.test(rawCode)) {
      return NextResponse.json(
        { error: 'Facility code must be 2-16 characters and use A-Z, 0-9, or hyphens' },
        { status: 400 }
      );
    }

    if (budget !== null && !Number.isFinite(budget)) {
      return NextResponse.json({ error: 'Budget must be a valid number' }, { status: 400 });
    }

    if (facilityType && !FACILITY_TYPE_VALUES.includes(facilityType as (typeof FACILITY_TYPE_VALUES)[number])) {
      return NextResponse.json({ error: 'Invalid facility blueprint selected' }, { status: 400 });
    }

    const existing = await db.department.findFirst({
      where: {
        companyId,
        OR: [{ code: rawCode }, { name }],
      },
      select: { id: true, name: true, code: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.code === rawCode
              ? 'A facility / site with this code already exists'
              : 'A facility / site with this name already exists',
        },
        { status: 409 }
      );
    }

    const department = await db.$transaction(async (tx) => {
      const created = await createDepartmentRecord(tx, {
        companyId,
        name,
        code: rawCode,
        budget,
        locationDetail: locationDetail || null,
        address: address || null,
        country: country || null,
        facilityType: facilityType || null,
      });
      const facilityCount = await tx.department.count({
        where: { companyId },
      });
      await tx.company.update({
        where: { id: companyId },
        data: { facilityCount },
      });
      return created;
    });

    await createAuditLog(auth.session, {
      action: 'create',
      entityType: 'department',
      entityId: department.id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        name: department.name,
        code: department.code,
        locationDetail: department.locationDetail || null,
        address: department.address || null,
        country: department.country || null,
        facilityType: department.facilityType || null,
      }),
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ error: 'Failed to create facility / site' }, { status: 500 });
  }
}

type CreateDepartmentRecordInput = {
  companyId: string;
  name: string;
  code: string;
  budget: number | null;
  locationDetail: string | null;
  address: string | null;
  country: string | null;
  facilityType: string | null;
};

async function createDepartmentRecord(
  tx: Prisma.TransactionClient,
  input: CreateDepartmentRecordInput
) {
  try {
    return await tx.department.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        code: input.code,
        budget: input.budget,
        locationDetail: input.locationDetail,
        address: input.address,
        country: input.country,
        facilityType: input.facilityType,
      },
    });
  } catch (error) {
    if (!isFacilityMetadataValidationError(error)) {
      throw error;
    }

    console.warn(
      'Facility metadata fields are unavailable on the active Prisma client. Retrying with a raw insert fallback.'
    );

    const createdAt = new Date();
    const updatedAt = new Date();
    const id = globalThis.crypto?.randomUUID?.() || `facility-${Date.now()}`;
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        code: string;
        budget: number | null;
        locationDetail: string | null;
        address: string | null;
        country: string | null;
        facilityType: string | null;
        companyId: string;
        notionPageId: string | null;
        notionSyncedAt: Date | null;
        notionLastEditedAt: Date | null;
        notionLastEditor: string | null;
        notionSyncStatus: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(Prisma.sql`
      INSERT INTO "public"."Department" (
        "id",
        "name",
        "code",
        "budget",
        "locationDetail",
        "address",
        "country",
        "facilityType",
        "companyId",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${id},
        ${input.name},
        ${input.code},
        ${input.budget},
        ${input.locationDetail},
        ${input.address},
        ${input.country},
        ${input.facilityType},
        ${input.companyId},
        ${createdAt},
        ${updatedAt}
      )
      RETURNING
        "id",
        "name",
        "code",
        "budget",
        "locationDetail",
        "address",
        "country",
        "facilityType",
        "companyId",
        "notionPageId",
        "notionSyncedAt",
        "notionLastEditedAt",
        "notionLastEditor",
        "notionSyncStatus",
        "createdAt",
        "updatedAt"
    `);

    const created = rows[0];
    if (!created) {
      throw new Error('Facility / site insert fallback did not return a record');
    }

    return created;
  }
}

function isFacilityMetadataValidationError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientValidationError)) {
    return false;
  }

  return ['locationDetail', 'address', 'country', 'facilityType'].some((field) =>
    error.message.includes(field)
  );
}
