import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDemoLedgerSeedCoverage } from '@/lib/demo-workspace-seed';
import { getEmissionsByCategory } from '@/lib/sync-service';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ('response' in auth) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const departmentId = searchParams.get('departmentId');
  const companyError = assertCompanyAccess(auth.session, companyId);
  if (companyError) {
    return companyError;
  }

  try {
    await ensureDemoLedgerSeedCoverage(db, { companyId: companyId! });

    const emissions = await getEmissionsByCategory(companyId!, departmentId);
    return NextResponse.json(emissions);
  } catch (error) {
    console.error('Error fetching emissions by category:', error);
    return NextResponse.json({ error: 'Failed to fetch emissions' }, { status: 500 });
  }
}
