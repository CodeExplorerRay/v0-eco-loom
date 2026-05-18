import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

const CRON_SECRET_ENV_KEYS = ['CRON_SECRET', 'AGENT_TASKS_CRON_SECRET'] as const;

type CronAuthorizationResult = {
  authorized: boolean;
  status: 401 | 503;
  publicError: string;
  logMessage: string;
};

function getConfiguredCronSecrets(): string[] {
  const secrets = new Set<string>();

  for (const key of CRON_SECRET_ENV_KEYS) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      secrets.add(value.trim());
    }
  }

  return [...secrets];
}

export function getCronSecret(): string | null {
  return getConfiguredCronSecrets()[0] ?? null;
}

function isVercelCronRequest(request: NextRequest): boolean {
  return request.headers.get('user-agent')?.toLowerCase().includes('vercel-cron/1.0') ?? false;
}

export function getCronAuthorizationResult(request: NextRequest): CronAuthorizationResult {
  const secrets = getConfiguredCronSecrets();
  const primarySecret = process.env.CRON_SECRET?.trim() || null;
  const legacySecret = process.env.AGENT_TASKS_CRON_SECRET?.trim() || null;

  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  const hasMatchingSecret =
    (bearerToken !== undefined && secrets.includes(bearerToken)) ||
    (headerSecret !== undefined && secrets.includes(headerSecret));

  if (hasMatchingSecret) {
    return {
      authorized: true,
      status: 401,
      publicError: '',
      logMessage: 'Authorized cron request',
    };
  }

  if (!primarySecret && !legacySecret) {
    return {
      authorized: false,
      status: 503,
      publicError: 'Cron secret is not configured on this deployment.',
      logMessage:
        'Blocked cron request because no cron secret is configured. Set CRON_SECRET on the deployed Vercel project.',
    };
  }

  if (isVercelCronRequest(request) && !primarySecret && legacySecret) {
    return {
      authorized: false,
      status: 503,
      publicError: 'Vercel cron is misconfigured for this deployment.',
      logMessage:
        'Blocked Vercel cron request because only AGENT_TASKS_CRON_SECRET is configured. Vercel only auto-sends the Authorization header when CRON_SECRET is set in the project environment.',
    };
  }

  if (!bearerToken && !headerSecret) {
    return {
      authorized: false,
      status: 401,
      publicError: 'Unauthorized cron request',
      logMessage:
        'Blocked cron request because no Authorization or x-cron-secret header was provided.',
    };
  }

  return {
    authorized: false,
    status: 401,
    publicError: 'Unauthorized cron request',
    logMessage: 'Blocked cron request because the provided cron secret did not match the configured value.',
  };
}

export function isAuthorizedCronRequest(request: NextRequest): boolean {
  return getCronAuthorizationResult(request).authorized;
}

function buildCronLockKey(lockName: string) {
  return `eco-loom:cron:${lockName}`;
}

export async function tryAcquireCronExecutionLock(lockName: string) {
  const lockKey = buildCronLockKey(lockName);
  const rows = await db.$queryRaw<Array<{ locked: boolean }>>(Prisma.sql`
    SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked
  `);

  return rows[0]?.locked === true;
}

export async function releaseCronExecutionLock(lockName: string) {
  const lockKey = buildCronLockKey(lockName);
  await db.$queryRaw(Prisma.sql`
    SELECT pg_advisory_unlock(hashtext(${lockKey}))
  `);
}
