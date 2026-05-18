import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

type IngestJobRow = {
  id: string;
  ingestType: string;
  status: string;
  progress: number;
  fileName: string;
  storedFileName: string | null;
  mimeType: string;
  fileSize: number;
  storagePath: string | null;
  documentUrl: string | null;
  rowCount: number | null;
  createdEntries: number | null;
  failedRows: number | null;
  message: string | null;
  errorMessage: string | null;
  result: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  departmentId: string | null;
  departmentName?: string | null;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
};

type CreateIngestJobInput = {
  ingestType: string;
  status: string;
  progress: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  message?: string | null;
  createdByUserId?: string | null;
  createdByName?: string | null;
  departmentId?: string | null;
  companyId: string;
};

type UpdateIngestJobInput = Partial<{
  status: string;
  progress: number;
  storedFileName: string | null;
  storagePath: string | null;
  documentUrl: string | null;
  rowCount: number | null;
  createdEntries: number | null;
  failedRows: number | null;
  message: string | null;
  errorMessage: string | null;
  result: string | null;
  departmentId: string | null;
}>;

const INGEST_JOB_SELECT = Prisma.sql`
  SELECT
    job."id",
    job."ingestType",
    job."status",
    job."progress",
    job."fileName",
    job."storedFileName",
    job."mimeType",
    job."fileSize",
    job."storagePath",
    job."documentUrl",
    job."rowCount",
    job."createdEntries",
    job."failedRows",
    job."message",
    job."errorMessage",
    job."result",
    job."createdByUserId",
    job."createdByName",
    job."departmentId",
    department."name" AS "departmentName",
    job."companyId",
    job."createdAt",
    job."updatedAt"
  FROM "IngestJob" job
  LEFT JOIN "Department" department ON department."id" = job."departmentId"
`;

function withWhereConditions(conditions: Prisma.Sql[]) {
  return conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;
}

export async function listStoredIngestJobs(input: {
  companyId: string;
  departmentId?: string | null;
  limit: number;
}) {
  const conditions = [Prisma.sql`job."companyId" = ${input.companyId}`];
  if (input.departmentId) {
    conditions.push(Prisma.sql`job."departmentId" = ${input.departmentId}`);
  }

  return db.$queryRaw<IngestJobRow[]>(Prisma.sql`
    ${INGEST_JOB_SELECT}
    ${withWhereConditions(conditions)}
    ORDER BY job."createdAt" DESC
    LIMIT ${input.limit}
  `);
}

export async function getStoredIngestJobById(id: string) {
  const rows = await db.$queryRaw<IngestJobRow[]>(Prisma.sql`
    ${INGEST_JOB_SELECT}
    WHERE job."id" = ${id}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

export async function countStoredIngestJobs(input: { companyId: string; status?: string }) {
  const conditions = [Prisma.sql`"companyId" = ${input.companyId}`];
  if (input.status) {
    conditions.push(Prisma.sql`"status" = ${input.status}`);
  }

  const rows = await db.$queryRaw<Array<{ count: bigint | number | string }>>(Prisma.sql`
    SELECT COUNT(*) AS count
    FROM "IngestJob"
    ${withWhereConditions(conditions)}
  `);

  return Number(rows[0]?.count ?? 0);
}

export async function getLatestStoredIngestJob(input: { companyId: string }) {
  const rows = await db.$queryRaw<Array<{ updatedAt: Date }>>(Prisma.sql`
    SELECT "updatedAt"
    FROM "IngestJob"
    WHERE "companyId" = ${input.companyId}
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `);

  return rows[0] ?? null;
}

export async function createStoredIngestJob(input: CreateIngestJobInput) {
  const rows = await db.$queryRaw<IngestJobRow[]>(Prisma.sql`
    WITH created AS (
      INSERT INTO "IngestJob" (
        "ingestType",
        "status",
        "progress",
        "fileName",
        "mimeType",
        "fileSize",
        "message",
        "createdByUserId",
        "createdByName",
        "departmentId",
        "companyId",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${input.ingestType},
        ${input.status},
        ${input.progress},
        ${input.fileName},
        ${input.mimeType},
        ${input.fileSize},
        ${input.message ?? null},
        ${input.createdByUserId ?? null},
        ${input.createdByName ?? null},
        ${input.departmentId ?? null},
        ${input.companyId},
        NOW(),
        NOW()
      )
      RETURNING *
    )
    SELECT
      created."id",
      created."ingestType",
      created."status",
      created."progress",
      created."fileName",
      created."storedFileName",
      created."mimeType",
      created."fileSize",
      created."storagePath",
      created."documentUrl",
      created."rowCount",
      created."createdEntries",
      created."failedRows",
      created."message",
      created."errorMessage",
      created."result",
      created."createdByUserId",
      created."createdByName",
      created."departmentId",
      department."name" AS "departmentName",
      created."companyId",
      created."createdAt",
      created."updatedAt"
    FROM created
    LEFT JOIN "Department" department ON department."id" = created."departmentId"
  `);

  return rows[0];
}

export async function updateStoredIngestJob(id: string, input: UpdateIngestJobInput) {
  const assignments: Prisma.Sql[] = [Prisma.sql`"updatedAt" = NOW()`];

  if (input.status !== undefined) assignments.push(Prisma.sql`"status" = ${input.status}`);
  if (input.progress !== undefined) assignments.push(Prisma.sql`"progress" = ${input.progress}`);
  if (input.storedFileName !== undefined) assignments.push(Prisma.sql`"storedFileName" = ${input.storedFileName}`);
  if (input.storagePath !== undefined) assignments.push(Prisma.sql`"storagePath" = ${input.storagePath}`);
  if (input.documentUrl !== undefined) assignments.push(Prisma.sql`"documentUrl" = ${input.documentUrl}`);
  if (input.rowCount !== undefined) assignments.push(Prisma.sql`"rowCount" = ${input.rowCount}`);
  if (input.createdEntries !== undefined) assignments.push(Prisma.sql`"createdEntries" = ${input.createdEntries}`);
  if (input.failedRows !== undefined) assignments.push(Prisma.sql`"failedRows" = ${input.failedRows}`);
  if (input.message !== undefined) assignments.push(Prisma.sql`"message" = ${input.message}`);
  if (input.errorMessage !== undefined) assignments.push(Prisma.sql`"errorMessage" = ${input.errorMessage}`);
  if (input.result !== undefined) assignments.push(Prisma.sql`"result" = ${input.result}`);
  if (input.departmentId !== undefined) assignments.push(Prisma.sql`"departmentId" = ${input.departmentId}`);

  const rows = await db.$queryRaw<IngestJobRow[]>(Prisma.sql`
    WITH updated AS (
      UPDATE "IngestJob"
      SET ${Prisma.join(assignments, ', ')}
      WHERE "id" = ${id}
      RETURNING *
    )
    SELECT
      updated."id",
      updated."ingestType",
      updated."status",
      updated."progress",
      updated."fileName",
      updated."storedFileName",
      updated."mimeType",
      updated."fileSize",
      updated."storagePath",
      updated."documentUrl",
      updated."rowCount",
      updated."createdEntries",
      updated."failedRows",
      updated."message",
      updated."errorMessage",
      updated."result",
      updated."createdByUserId",
      updated."createdByName",
      updated."departmentId",
      department."name" AS "departmentName",
      updated."companyId",
      updated."createdAt",
      updated."updatedAt"
    FROM updated
    LEFT JOIN "Department" department ON department."id" = updated."departmentId"
  `);

  const row = rows[0];
  if (!row) {
    throw new Error(`Ingest job ${id} was not found after update.`);
  }

  return row;
}
