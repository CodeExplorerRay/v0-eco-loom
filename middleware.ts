import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'eco-loom-session';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getRequestOrigin(request: NextRequest) {
  return request.nextUrl.origin;
}

function parseOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isTrustedMutationRequest(request: NextRequest) {
  const expectedOrigin = getRequestOrigin(request);
  const origin = parseOrigin(request.headers.get('origin'));
  const referer = parseOrigin(request.headers.get('referer'));

  if (origin) {
    return origin === expectedOrigin;
  }

  if (referer) {
    return referer === expectedOrigin;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/cron/') &&
    MUTATING_METHODS.has(request.method) &&
    hasSessionCookie &&
    !isTrustedMutationRequest(request)
  ) {
    return NextResponse.json(
      { error: 'Blocked cross-origin state-changing request' },
      { status: 403 }
    );
  }

  if (pathname.startsWith('/dashboard') && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/api/:path*'],
};
