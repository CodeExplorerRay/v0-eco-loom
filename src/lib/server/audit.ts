import { db } from '@/lib/db';
import { ApiSession } from '@/lib/server/auth';

type AuditInput = {
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
};

export async function createAuditLog(session: ApiSession | null, input: AuditInput) {
  const details = enrichAuditDetails(input.details, session);

  await db.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: session?.userId,
      details,
    },
  });
}

function enrichAuditDetails(details: string | undefined, session: ApiSession | null) {
  const auditMetadata = {
    companyId: session?.companyId ?? null,
    actorId: session?.userId ?? null,
    actorName: session?.userName ?? null,
    actorEmail: session?.userEmail ?? null,
  };

  if (!details) {
    return JSON.stringify(auditMetadata);
  }

  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return JSON.stringify({
        ...auditMetadata,
        ...parsed,
      });
    }
  } catch {
    return JSON.stringify({
      ...auditMetadata,
      rawDetails: details,
    });
  }

  return JSON.stringify({
    ...auditMetadata,
    rawDetails: details,
  });
}
