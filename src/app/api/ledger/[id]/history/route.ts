import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';

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
    const entry = await db.carbonLedgerEntry.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const companyError = assertCompanyAccess(auth.session, entry.companyId);
    if (companyError) {
      return companyError;
    }

    const history = await db.auditLog.findMany({
      where: {
        entityType: 'carbon_ledger_entry',
        entityId: id,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching ledger history:', error);
    return NextResponse.json({ error: 'Failed to fetch ledger history' }, { status: 500 });
  }
}
