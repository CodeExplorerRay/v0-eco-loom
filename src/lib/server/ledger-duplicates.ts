import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

type FindLedgerDuplicateInput = {
  companyId: string;
  departmentId: string;
  sourceType: string;
  category?: string | null;
  activityValue: number;
  activityUnit: string;
  transactionDate: Date;
  reportingPeriod: string;
  sourceDocument?: string | null;
  excludeId?: string;
};

export type LedgerDuplicateRecord = {
  id: string;
  sourceDocument: string | null;
  notionPageId: string | null;
  notionLastEditedAt: Date | null;
  transactionDate: Date;
  reportingPeriod: string;
  department: {
    name: string;
  } | null;
};

function getDayWindow(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function normalizeDocumentName(sourceDocument?: string | null) {
  if (typeof sourceDocument !== 'string') {
    return null;
  }

  const normalized = sourceDocument.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function findMatchingLedgerEntry(
  input: FindLedgerDuplicateInput
): Promise<LedgerDuplicateRecord | null> {
  const { start, end } = getDayWindow(input.transactionDate);
  const normalizedSourceDocument = normalizeDocumentName(input.sourceDocument);

  const where: Prisma.CarbonLedgerEntryWhereInput = {
    companyId: input.companyId,
    departmentId: input.departmentId,
    sourceType: input.sourceType,
    activityValue: input.activityValue,
    activityUnit: input.activityUnit,
    reportingPeriod: input.reportingPeriod,
    transactionDate: {
      gte: start,
      lte: end,
    },
    ...(input.category ? { category: input.category } : {}),
    ...(input.excludeId
      ? {
          NOT: {
            id: input.excludeId,
          },
        }
      : {}),
    ...(normalizedSourceDocument
      ? {
          sourceDocument: normalizedSourceDocument,
        }
      : {
          OR: [{ sourceDocument: null }, { sourceDocument: '' }],
        }),
  };

  return db.carbonLedgerEntry.findFirst({
    where,
    select: {
      id: true,
      sourceDocument: true,
      notionPageId: true,
      notionLastEditedAt: true,
      transactionDate: true,
      reportingPeriod: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });
}

export function getLedgerDuplicateErrorMessage(entry: LedgerDuplicateRecord) {
  const facilityName = entry.department?.name || 'this facility';
  const transactionDate = new Date(entry.transactionDate).toLocaleDateString();

  return `A matching ledger entry already exists for ${facilityName} on ${transactionDate}. Open the existing record instead of creating a duplicate entry.`;
}
