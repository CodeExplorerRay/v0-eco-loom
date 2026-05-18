import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/server/audit';
import { assertCompanyAccess, requireApiSession } from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const forceDelete = searchParams.get('force') === 'true';
    const companyError = assertCompanyAccess(auth.session, companyId);
    if (companyError) {
      return companyError;
    }

    const department = await db.department.findFirst({
      where: {
        id,
        companyId: companyId!,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!department) {
      return NextResponse.json({ error: 'Facility / site not found' }, { status: 404 });
    }

    const [ledgerCount, goalCount] = await Promise.all([
      db.carbonLedgerEntry.count({
        where: { departmentId: id },
      }),
      db.sustainabilityGoal.count({
        where: { departmentId: id },
      }),
    ]);

    if (ledgerCount > 0 || goalCount > 0) {
      if (forceDelete) {
        console.warn(
          `Force deleting facility ${department.id} with ${ledgerCount} ledger entries and ${goalCount} goals.`
        );
      } else {
        return NextResponse.json(
          {
            error:
              'This facility / site still has ledger entries or goals. Review the counts and confirm if you want to delete the facility together with its site data.',
            blockingRecords: {
              ledgerEntries: ledgerCount,
              goals: goalCount,
            },
            canForceDelete: true,
          },
          { status: 409 }
        );
      }
    }

    const deletedCounts = await db.$transaction(async (tx) => {
      const forceDeletedLedgerCount = forceDelete
        ? (
            await tx.carbonLedgerEntry.deleteMany({
              where: { departmentId: id },
            })
          ).count
        : 0;
      const forceDeletedGoalCount = forceDelete
        ? (
            await tx.sustainabilityGoal.deleteMany({
              where: { departmentId: id },
            })
          ).count
        : 0;

      await tx.department.delete({
        where: { id },
      });
      const facilityCount = await tx.department.count({
        where: { companyId: companyId! },
      });
      await tx.company.update({
        where: { id: companyId! },
        data: { facilityCount },
      });

      return {
        forceDeletedLedgerCount,
        forceDeletedGoalCount,
      };
    });

    try {
      await createAuditLog(auth.session, {
        action: 'delete',
        entityType: 'department',
        entityId: id,
        details: JSON.stringify({
          actor: auth.session.userEmail,
          name: department.name,
          code: department.code,
          forceDeleted: forceDelete,
          deletedLedgerEntries: deletedCounts.forceDeletedLedgerCount,
          deletedGoals: deletedCounts.forceDeletedGoalCount,
        }),
      });
    } catch (auditError) {
      console.warn('Facility deleted but audit log creation failed:', auditError);
    }

    return NextResponse.json({
      success: true,
      deletedCounts: {
        ledgerEntries: deletedCounts.forceDeletedLedgerCount,
        goals: deletedCounts.forceDeletedGoalCount,
      },
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Failed to delete facility / site' }, { status: 500 });
  }
}
