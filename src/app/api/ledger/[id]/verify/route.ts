import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recalculateGoalProgress } from '@/lib/sync-service';
import { assertCompanyAccess, isAdmin, requireApiSession } from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';
import { syncLedgerEntriesToNotion } from '@/lib/server/notion-sync';
import { enforceRateLimit } from '@/lib/server/rate-limit';

// POST - Verify a ledger entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;
  
  try {
    const existingEntry = await db.carbonLedgerEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const companyError = assertCompanyAccess(auth.session, existingEntry.companyId);
    if (companyError) {
      return companyError;
    }

    if (!isAdmin(auth.session)) {
      return NextResponse.json({ error: 'Only admins can verify ledger entries' }, { status: 403 });
    }

    if (existingEntry.verified) {
      return NextResponse.json(
        { error: 'This ledger entry has already been verified' },
        { status: 409 }
      );
    }

    const entry = await db.carbonLedgerEntry.update({
      where: { id },
      data: {
        verified: true,
        verifiedBy: auth.session.userName,
        verifiedByUserId: auth.session.userId,
        verifiedAt: new Date(),
        updatedByUserId: auth.session.userId,
        updatedByName: auth.session.userName,
      },
      include: { department: true, appliedEmissionFactor: true },
    });

    await createAuditLog(auth.session, {
      action: 'verify',
      entityType: 'carbon_ledger_entry',
      entityId: id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        verifiedBy: auth.session.userName,
        verifiedAt: new Date().toISOString(),
      }),
    });

    // Sync with goals - recalculate progress after verification
    await recalculateGoalProgress(entry.companyId);

    const ledgerSync = await syncLedgerEntriesToNotion({
      companyId: entry.companyId,
      entryIds: [entry.id],
    });

    if (ledgerSync.status === 'completed' && ledgerSync.result.success > 0) {
      const syncedEntry = await db.carbonLedgerEntry.findUnique({
        where: { id },
        include: { department: true, appliedEmissionFactor: true },
      });

      return NextResponse.json({
        ...(syncedEntry || entry),
        notionSync: {
          status: 'synced',
        },
      });
    }

    if (ledgerSync.status === 'completed' && ledgerSync.result.failed > 0) {
      console.warn('[Ledger Verify] Verified entry but Notion sync failed', ledgerSync.result.errors);
      return NextResponse.json({
        ...entry,
        notionSync: {
          status: 'failed',
          reason: ledgerSync.result.errors[0]?.error || 'Notion sync failed',
        },
      });
    }

    return NextResponse.json({
      ...entry,
      notionSync: {
        status: 'skipped',
        reason:
          ledgerSync.status === 'skipped'
            ? ledgerSync.reason
            : 'Notion sync did not complete',
      },
    });
  } catch (error) {
    console.error('Error verifying entry:', error);
    return NextResponse.json({ error: 'Failed to verify entry' }, { status: 500 });
  }
}
