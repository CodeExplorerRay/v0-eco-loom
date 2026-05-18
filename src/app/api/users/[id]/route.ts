import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/server/audit';
import {
  countCompanyAdmins,
  generateAccessToken,
  hashAccessTokenForStorage,
  isProtectedDemoAccount,
  requireApiSession,
} from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import {
  USER_NAME_CHANGE_LOCKED,
  USER_NAME_CHANGE_LOCK_MESSAGE,
  USER_ROLE_AND_STATUS_LOCK_MESSAGE,
  USER_ROLE_AND_STATUS_LOCKED,
} from '@/lib/user-management';

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    companyId: user.companyId,
    demoProtected: isProtectedDemoAccount({ email: user.email }),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function PATCH(
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
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser || existingUser.companyId !== auth.session.companyId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const nextName = typeof body.name === 'string' ? body.name.trim() : undefined;
    const nextRole = body.role === 'admin' || body.role === 'standard' ? body.role : undefined;
    const nextStatus = body.status === 'active' || body.status === 'inactive' ? body.status : undefined;
    const rotateAccessToken = body.rotateAccessToken === true;
    const isProtectedDemoUser = isProtectedDemoAccount({ email: existingUser.email });
    const requestedNameChange = Boolean(nextName && nextName !== existingUser.name);
    const isAdminPromotion =
      existingUser.role !== 'admin' && nextRole === 'admin';
    const requestedRoleChange = Boolean(nextRole && nextRole !== existingUser.role);
    const requestedStatusChange = Boolean(nextStatus && nextStatus !== existingUser.status);

    if (
      isProtectedDemoUser &&
      (requestedNameChange || requestedRoleChange || requestedStatusChange || rotateAccessToken)
    ) {
      return NextResponse.json(
        {
          error:
            'The Eco-Loom demo accounts are protected for now. Name, role, status, and token rotation are disabled.',
        },
        { status: 403 }
      );
    }

    if (USER_NAME_CHANGE_LOCKED && requestedNameChange) {
      return NextResponse.json(
        {
          error: USER_NAME_CHANGE_LOCK_MESSAGE,
        },
        { status: 403 }
      );
    }

    if (USER_ROLE_AND_STATUS_LOCKED && (requestedRoleChange || requestedStatusChange)) {
      return NextResponse.json(
        {
          error: USER_ROLE_AND_STATUS_LOCK_MESSAGE,
        },
        { status: 403 }
      );
    }

    if (isAdminPromotion) {
      return NextResponse.json(
        {
          error:
            'Creating additional admin accounts is temporarily disabled for this demo workspace.',
        },
        { status: 403 }
      );
    }

    if (existingUser.id === auth.session.userId && nextStatus === 'inactive') {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
    }

    const removingAdminPrivileges =
      existingUser.role === 'admin' &&
      ((nextRole && nextRole !== 'admin') || nextStatus === 'inactive');

    if (removingAdminPrivileges) {
      const otherAdminCount = await countCompanyAdmins(existingUser.companyId, existingUser.id);
      if (otherAdminCount === 0) {
        return NextResponse.json(
          { error: 'At least one active admin must remain in the workspace' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (nextName) {
      updateData.name = nextName;
    }
    if (nextRole) {
      updateData.role = nextRole;
    }
    if (nextStatus) {
      updateData.status = nextStatus;
    }

    let generatedAccessToken: string | null = null;
    if (rotateAccessToken) {
      generatedAccessToken = generateAccessToken((nextRole || existingUser.role) as 'admin' | 'standard');
      updateData.accessTokenHash = hashAccessTokenForStorage(generatedAccessToken);
    }

    const user = await db.user.update({
      where: { id: existingUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog(auth.session, {
      action: rotateAccessToken ? 'rotate_access_token' : 'update',
      entityType: 'user',
      entityId: user.id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        changes: {
          name: nextName,
          role: nextRole,
          status: nextStatus,
          rotatedAccessToken: rotateAccessToken,
        },
      }),
    });

    return NextResponse.json({
      user: sanitizeUser(user),
      generatedAccessToken,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
