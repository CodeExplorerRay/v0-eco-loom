import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const AUTH_COOKIE_NAME = 'eco-loom-session';
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 8;
const DEV_AUTH_TOKEN = 'eco-loom-local-admin';
const DEV_STANDARD_AUTH_TOKEN = 'eco-loom-standard-user';
const DEV_AUTH_SECRET = 'eco-loom-local-auth-secret-change-me';
const DEFAULT_COMPANY_ID = 'demo-company-1';
const DEFAULT_COMPANY_NAME = 'Eco-Loom Workspace';
const DEV_ADMIN_EMAIL = 'admin@eco-loom.local';
const DEV_ADMIN_NAME = 'Eco-Loom Admin';
const DEV_STANDARD_EMAIL = 'analyst@eco-loom.local';
const DEV_STANDARD_NAME = 'Sustainability Analyst';
const DEV_BOOTSTRAP_FLAG = 'ECO_LOOM_ENABLE_DEV_BOOTSTRAP';

export type AppRole = 'admin' | 'standard';

export interface ApiSession {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  role: AppRole;
  exp: number;
  nonce: string;
}

type AuthOptions = {
  requireAdmin?: boolean;
  allowedRoles?: AppRole[];
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  companyId: string;
  accessTokenHash: string;
  status: string;
};

function normalizeStoredRole(role: string): AppRole | null {
  return role === 'admin' || role === 'standard' ? role : null;
}

function readAdminAuthToken(): string {
  if (process.env.ECO_LOOM_API_TOKEN) {
    if (process.env.NODE_ENV === 'production' && process.env.ECO_LOOM_API_TOKEN === DEV_AUTH_TOKEN) {
      throw new Error('ECO_LOOM_API_TOKEN cannot use the insecure development default in production');
    }
    return process.env.ECO_LOOM_API_TOKEN;
  }

  if (isDevBootstrapEnabled()) {
    return DEV_AUTH_TOKEN;
  }

  throw new Error('ECO_LOOM_API_TOKEN is required unless explicit local dev bootstrap is enabled');
}

function readStandardAuthToken(): string | null {
  if (process.env.ECO_LOOM_STANDARD_USER_TOKEN) {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ECO_LOOM_STANDARD_USER_TOKEN === DEV_STANDARD_AUTH_TOKEN
    ) {
      throw new Error(
        'ECO_LOOM_STANDARD_USER_TOKEN cannot use the insecure development default in production'
      );
    }
    return process.env.ECO_LOOM_STANDARD_USER_TOKEN;
  }

  if (isDevBootstrapEnabled()) {
    return DEV_STANDARD_AUTH_TOKEN;
  }

  return null;
}

function readAuthSecret(): string {
  if (process.env.ECO_LOOM_AUTH_SECRET) {
    if (process.env.NODE_ENV === 'production' && process.env.ECO_LOOM_AUTH_SECRET === DEV_AUTH_SECRET) {
      throw new Error('ECO_LOOM_AUTH_SECRET cannot use the insecure development default in production');
    }
    return process.env.ECO_LOOM_AUTH_SECRET;
  }

  if (isDevBootstrapEnabled()) {
    return DEV_AUTH_SECRET;
  }

  throw new Error('ECO_LOOM_AUTH_SECRET is required unless explicit local dev bootstrap is enabled');
}

function isDevBootstrapEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env[DEV_BOOTSTRAP_FLAG] === 'true';
}

export function getAuthorizedCompanyId(): string {
  return process.env.ECO_LOOM_ALLOWED_COMPANY_ID || DEFAULT_COMPANY_ID;
}

function getAuthorizedCompanyName(): string {
  return process.env.ECO_LOOM_COMPANY_NAME || DEFAULT_COMPANY_NAME;
}

function readAdminIdentity() {
  return {
    email: (process.env.ECO_LOOM_ADMIN_EMAIL || DEV_ADMIN_EMAIL).toLowerCase(),
    name: process.env.ECO_LOOM_ADMIN_NAME || DEV_ADMIN_NAME,
  };
}

function readStandardIdentity() {
  return {
    email: (process.env.ECO_LOOM_STANDARD_USER_EMAIL || DEV_STANDARD_EMAIL).toLowerCase(),
    name: process.env.ECO_LOOM_STANDARD_USER_NAME || DEV_STANDARD_NAME,
  };
}

export function isProtectedDemoAccount(user: { email: string }) {
  const normalizedEmail = user.email.trim().toLowerCase();
  const adminEmail = readAdminIdentity().email;
  const standardEmail = readStandardIdentity().email;

  return normalizedEmail === adminEmail || normalizedEmail === standardEmail;
}

function getSessionTtlSeconds(): number {
  const ttl = Number.parseInt(process.env.ECO_LOOM_SESSION_TTL_SECONDS || '', 10);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_SESSION_TTL_SECONDS;
}

function signPayload(payload: string): string {
  return createHmac('sha256', readAuthSecret()).update(payload).digest('base64url');
}

function hashAccessToken(token: string) {
  return createHash('sha256').update(`${readAuthSecret()}:${token}`).digest('hex');
}

export function hashAccessTokenForStorage(token: string) {
  return hashAccessToken(token);
}

export function generateAccessToken(role: AppRole) {
  const prefix = role === 'admin' ? 'eco_admin' : 'eco_user';
  return `${prefix}_${randomBytes(18).toString('base64url')}`;
}

function serializeSession(session: ApiSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function parseSession(value: string | undefined): ApiSession | null {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split('.');
  if (!payload || !signature) {
    return null;
  }

  const expected = signPayload(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ApiSession;
    if (
      !session?.companyId ||
      !session.userId ||
      !session.userEmail ||
      !session.userName ||
      !['admin', 'standard'].includes(session.role) ||
      session.exp <= Date.now()
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function createSession(user: Pick<AuthUser, 'id' | 'email' | 'name' | 'role' | 'companyId'>): ApiSession {
  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    companyId: user.companyId,
    role: user.role,
    exp: Date.now() + getSessionTtlSeconds() * 1000,
    nonce: randomBytes(12).toString('hex'),
  };
}

export function applySessionCookie(response: NextResponse, session: ApiSession) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: serializeSession(session),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getSessionTtlSeconds(),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export function getSessionFromRequest(request: NextRequest): ApiSession | null {
  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  return parseSession(cookieValue);
}

export function getSessionFromCookieValue(cookieValue: string | undefined): ApiSession | null {
  return parseSession(cookieValue);
}

async function getCurrentSessionUser(session: ApiSession) {
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
      status: true,
    },
  });

  if (!user) {
    return null;
  }

  const role = normalizeStoredRole(user.role);
  if (!role) {
    return null;
  }

  return {
    ...user,
    role,
  };
}

export async function ensureBootstrapUsers() {
  if (!isDevBootstrapEnabled()) {
    return;
  }

  const companyId = getAuthorizedCompanyId();

  const existingCompany = await db.company.findUnique({
    where: { id: companyId },
  });

  if (!existingCompany) {
    await db.company.create({
      data: {
        id: companyId,
        name: getAuthorizedCompanyName(),
        defaultReportMode: 'internal_management',
        defaultReportingStandard: 'GHG Protocol Corporate Standard',
        defaultGwpBasis:
          'Mixed factor-library basis with published provenance carried per entry and disclosed in report outputs.',
        defaultFactorSourcePolicy:
          'Use the approved Eco-Loom factor library as the default source hierarchy and carry entry-level provenance into report outputs.',
        defaultOverridePolicy:
          'Custom factor overrides are restricted to admins and require a documented reason, actor, and timestamp.',
        defaultReportRecipients: 'finance@ecotech.example, leadership@ecotech.example',
        defaultApprovalWorkflow:
          'Sustainability lead review followed by admin approval before publication.',
        defaultOrganizationalBoundaryMethod: 'operational_control',
        defaultOrganizationalBoundaryNotes:
          'The reporting entity follows the configured operational control boundary for this workspace.',
        defaultScope2Method: 'location_based',
        defaultBaseYear: new Date().getFullYear() - 1,
        defaultBaseYearNotes:
          'Base year totals should be restated when structural or methodological changes materially affect comparability.',
        defaultBaseYearRecalculationPolicy:
          'Recalculate the base year when acquisitions, divestitures, outsourcing, insourcing, or factor methodology changes materially affect reported emissions trends.',
      },
    });
  }

  const admin = readAdminIdentity();
  const existingAdmin = await db.user.findUnique({
    where: { email: admin.email },
  });

  if (!existingAdmin) {
    await db.user.create({
      data: {
        email: admin.email,
        name: admin.name,
        role: 'admin',
        status: 'active',
        companyId,
        accessTokenHash: hashAccessToken(readAdminAuthToken()),
      },
    });
  }

  const standardToken = readStandardAuthToken();
  if (standardToken) {
    const standard = readStandardIdentity();
    const existingStandard = await db.user.findUnique({
      where: { email: standard.email },
    });

    if (!existingStandard) {
      await db.user.create({
        data: {
          email: standard.email,
          name: standard.name,
          role: 'standard',
          status: 'active',
          companyId,
          accessTokenHash: hashAccessToken(standardToken),
        },
      });
    }
  }
}

export async function getSessionUserRecord(session: ApiSession) {
  return getCurrentSessionUser(session);
}

export async function countCompanyAdmins(companyId: string, excludeUserId?: string) {
  return db.user.count({
    where: {
      companyId,
      role: 'admin',
      status: 'active',
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

export async function validateUserLogin(email: string, token: string): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !token) {
    return null;
  }

  if (isDevBootstrapEnabled()) {
    await ensureBootstrapUsers();
  }

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
      accessTokenHash: true,
      status: true,
    },
  });

  if (!user || user.status !== 'active') {
    return null;
  }

  const actualBuffer = Buffer.from(hashAccessToken(token));
  const expectedBuffer = Buffer.from(user.accessTokenHash);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  return user as AuthUser;
}

export function unauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

function staleSessionResponse(message = 'Session is no longer valid') {
  const response = NextResponse.json({ error: message }, { status: 401 });
  clearSessionCookie(response);
  return response;
}

function normalizeSession(
  session: ApiSession,
  user: Pick<AuthUser, 'id' | 'email' | 'name' | 'role' | 'companyId' | 'status'>
): ApiSession {
  return {
    ...session,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    role: user.role,
    companyId: user.companyId,
  };
}

export async function getValidatedSessionFromRequest(request: NextRequest): Promise<ApiSession | null> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return null;
  }

  const user = await getCurrentSessionUser(session);
  if (!user || user.status !== 'active') {
    return null;
  }

  return normalizeSession(session, user);
}

export async function getValidatedSessionFromCookieValue(
  cookieValue: string | undefined
): Promise<ApiSession | null> {
  const session = getSessionFromCookieValue(cookieValue);
  if (!session) {
    return null;
  }

  const user = await getCurrentSessionUser(session);
  if (!user || user.status !== 'active') {
    return null;
  }

  return normalizeSession(session, user);
}

export async function requireApiSession(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<{ session: ApiSession } | { response: NextResponse }> {
  const session = getSessionFromRequest(request);

  if (!session) {
    return { response: unauthorizedResponse() };
  }

  const user = await getCurrentSessionUser(session);
  if (!user || user.status !== 'active') {
    return { response: staleSessionResponse() };
  }

  const normalizedSession = normalizeSession(session, user);

  const allowedRoles = options.allowedRoles ?? (options.requireAdmin ? (['admin'] as AppRole[]) : null);
  if (allowedRoles && !allowedRoles.includes(normalizedSession.role)) {
    return { response: forbiddenResponse() };
  }

  return { session: normalizedSession };
}

export function assertCompanyAccess(session: ApiSession, companyId: string | null | undefined) {
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  if (companyId !== session.companyId) {
    return forbiddenResponse('You do not have access to this company');
  }

  return null;
}

export function getEffectiveCompanyId(session: ApiSession) {
  return session.companyId;
}

export function isAdmin(session: ApiSession) {
  return session.role === 'admin';
}

export function canEditLedgerEntry(
  session: ApiSession,
  entry: { createdByUserId?: string | null; verified: boolean }
) {
  if (isAdmin(session)) {
    return true;
  }

  return entry.createdByUserId === session.userId;
}
