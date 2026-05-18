import { NextRequest, NextResponse } from 'next/server';
import {
  applySessionCookie,
  clearSessionCookie,
  createSession,
  ensureBootstrapUsers,
  getValidatedSessionFromRequest,
  unauthorizedResponse,
  validateUserLogin,
} from '@/lib/server/auth';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export async function GET(request: NextRequest) {
  const session = await getValidatedSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    companyId: session.companyId,
    role: session.role,
    user: {
      id: session.userId,
      email: session.userEmail,
      name: session.userName,
    },
  });
}

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, 'login');
  if (rateLimited) {
    return rateLimited;
  }

  try {
    await ensureBootstrapUsers();
  } catch (error) {
    console.error('Failed to prepare login session', error);
    return NextResponse.json(
      { error: 'Workspace sign-in is temporarily unavailable. Please try again shortly.' },
      { status: 500 }
    );
  }

  let body: { email?: unknown; token?: unknown };
  try {
    const payload = await request.json();
    body = typeof payload === 'object' && payload !== null ? (payload as { email?: unknown; token?: unknown }) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid login request.' }, { status: 400 });
  }

  try {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const token = typeof body.token === 'string' ? body.token.trim() : '';

    if (!email) {
      return unauthorizedResponse('Email is required');
    }

    if (!token) {
      return unauthorizedResponse('Access token is required');
    }

    const user = await validateUserLogin(email, token);
    if (!user) {
      return unauthorizedResponse('Invalid email or access token');
    }

    const session = createSession(user);
    const response = NextResponse.json({
      authenticated: true,
      companyId: session.companyId,
      role: session.role,
      user: {
        id: session.userId,
        email: session.userEmail,
        name: session.userName,
      },
    });

    applySessionCookie(response, session);
    return response;
  } catch (error) {
    console.error('Failed to create login session', error);
    return NextResponse.json(
      { error: 'Workspace sign-in is temporarily unavailable. Please try again shortly.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, 'write');
  if (rateLimited) {
    return rateLimited;
  }

  const response = NextResponse.json({ authenticated: false });
  clearSessionCookie(response);
  return response;
}
