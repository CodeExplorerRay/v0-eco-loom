import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type RateLimitPolicy = {
  limit: number;
  windowMs: number;
  message: string;
};

type RateLimitPolicyName = 'login' | 'write' | 'heavyWrite' | 'seed';

type RateLimitRow = {
  count: number;
  resetAt: Date;
};

const POLICIES: Record<RateLimitPolicyName, RateLimitPolicy> = {
  login: {
    limit: 5,
    windowMs: 10 * 60 * 1000,
    message: 'Too many login attempts. Please try again in a few minutes.',
  },
  write: {
    limit: 30,
    windowMs: 60 * 1000,
    message: 'Too many write requests. Please slow down and try again shortly.',
  },
  heavyWrite: {
    limit: 10,
    windowMs: 5 * 60 * 1000,
    message: 'Too many high-cost requests. Please wait a few minutes before trying again.',
  },
  seed: {
    limit: 2,
    windowMs: 60 * 60 * 1000,
    message: 'Seed requests are temporarily limited. Please wait before trying again.',
  },
};

let rateLimitTableReady: Promise<void> | null = null;

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip =
    forwardedFor?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const sessionFragment = request.cookies.get('eco-loom-session')?.value?.slice(0, 24);

  return sessionFragment ? `${ip}:${sessionFragment}` : ip;
}

async function ensureRateLimitTable() {
  if (!rateLimitTableReady) {
    rateLimitTableReady = (async () => {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
          "key" TEXT PRIMARY KEY,
          "count" INTEGER NOT NULL,
          "resetAt" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "RateLimitBucket_resetAt_idx"
        ON "RateLimitBucket" ("resetAt")
      `);
    })().catch((error) => {
      rateLimitTableReady = null;
      throw error;
    });
  }

  return rateLimitTableReady;
}

function buildRateLimitResponse(policy: RateLimitPolicy, resetAt: Date) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: policy.message,
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': String(policy.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetAt.getTime() / 1000)),
      },
    }
  );
}

export async function enforceRateLimit(
  request: NextRequest,
  policyName: RateLimitPolicyName
) {
  const policy = POLICIES[policyName];
  const now = new Date();
  const nextResetAt = new Date(now.getTime() + policy.windowMs);
  const key = `${policyName}:${request.nextUrl.pathname}:${getClientIdentifier(request)}`;

  try {
    await ensureRateLimitTable();

    if (Math.random() < 0.03) {
      void db.$executeRawUnsafe(
        `DELETE FROM "RateLimitBucket" WHERE "resetAt" <= $1`,
        now
      ).catch((cleanupError) => {
        console.error('Failed to clean up expired rate-limit buckets', cleanupError);
      });
    }

    const decision = await db.$transaction(async (tx) => {
      const existingRows = await tx.$queryRawUnsafe<RateLimitRow[]>(
        `SELECT "count", "resetAt" FROM "RateLimitBucket" WHERE "key" = $1 LIMIT 1`,
        key
      );
      const existing = existingRows[0] ?? null;

      if (!existing || existing.resetAt <= now) {
        await tx.$executeRawUnsafe(
          `
            INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
            VALUES ($1, 1, $2)
            ON CONFLICT ("key")
            DO UPDATE SET
              "count" = 1,
              "resetAt" = $2,
              "updatedAt" = CURRENT_TIMESTAMP
          `,
          key,
          nextResetAt
        );

        return { limited: false, resetAt: nextResetAt };
      }

      if (existing.count >= policy.limit) {
        return { limited: true, resetAt: existing.resetAt };
      }

      await tx.$executeRawUnsafe(
        `
          UPDATE "RateLimitBucket"
          SET "count" = "count" + 1,
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "key" = $1
        `,
        key
      );

      return { limited: false, resetAt: existing.resetAt };
    });

    if (decision.limited) {
      return buildRateLimitResponse(policy, decision.resetAt);
    }
  } catch (error) {
    console.error(`Rate limit check failed for policy "${policyName}"`, error);
  }

  return null;
}
