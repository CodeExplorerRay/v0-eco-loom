import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/server/audit';
import {
  generateAccessToken,
  hashAccessTokenForStorage,
  isProtectedDemoAccount,
  requireApiSession,
} from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import {
  USER_CREATION_LOCK_MESSAGE,
  USER_CREATION_LOCKED,
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

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, { requireAdmin: true });
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const users = await db.user.findMany({
      where: { companyId: auth.session.companyId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
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

    return NextResponse.json(users.map(sanitizeUser));
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
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
    if (USER_CREATION_LOCKED) {
      return NextResponse.json({ error: USER_CREATION_LOCK_MESSAGE }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = normalizeEmail(body.email);
    const role = body.role === 'admin' || body.role === 'standard' ? body.role : null;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ error: 'Select a valid role' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            existingUser.companyId === auth.session.companyId
              ? 'A user with this email already exists in the workspace'
              : 'This email is already assigned to a different workspace user',
        },
        { status: 409 }
      );
    }

    const generatedAccessToken = generateAccessToken(role);

    const user = await db.user.create({
      data: {
        name,
        email,
        role,
        status: 'active',
        companyId: auth.session.companyId,
        accessTokenHash: hashAccessTokenForStorage(generatedAccessToken),
      },
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
      action: 'create',
      entityType: 'user',
      entityId: user.id,
      details: JSON.stringify({
        actor: auth.session.userEmail,
        createdUser: {
          email: user.email,
          role: user.role,
          status: user.status,
        },
      }),
    });

    return NextResponse.json({
      user: sanitizeUser(user),
      generatedAccessToken,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
