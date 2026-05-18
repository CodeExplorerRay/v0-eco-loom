# Deploy Eco-Loom to Vercel with Neon

This project is already configured for Prisma + PostgreSQL in `prisma/schema.prisma`.

## 1. Create a Neon database

In Neon:
- create a project
- create a database
- copy both connection strings:
  - pooled connection string
  - direct connection string

Use them like this:
- `DATABASE_URL` = pooled Neon URL
- `DIRECT_URL` = direct Neon URL

## 2. Configure local environment

Copy `.env.example` to `.env` and replace the placeholder values with your real Neon URLs and secrets.

Required values:
- `DATABASE_URL`
- `DIRECT_URL`
- `ECO_LOOM_AUTH_SECRET`
- `ECO_LOOM_ENCRYPTION_KEY`
- `ECO_LOOM_API_TOKEN`
- `CRON_SECRET`

Recommended:
- `ECO_LOOM_STANDARD_USER_TOKEN`
- `ECO_LOOM_COMPANY_NAME`
- `ECO_LOOM_ALLOWED_COMPANY_ID`

## 3. Initialize the Neon schema

For the first deployment, this repo uses `prisma db push` in the Vercel build so the schema can be created even though there is no committed `prisma/migrations` folder yet.

You can also initialize locally:

```bash
npm run db:generate
npm run db:push
```

## 4. Optional local verification

Run:

```bash
npm run lint
npm run dev
```

If you want to verify the database connection:

```bash
npm run db:push
```

## 5. Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Add the environment variables from `.env.example` into:
   - Development
   - Preview
   - Production
4. Set the build command to:

```bash
npm run vercel-build
```

5. Deploy.

## 6. Cron jobs

This repo already includes `vercel.json`:

- `/api/cron/agent-tasks`
- runs once per day at `02:00 UTC` by default so it deploys on Vercel Hobby

Set:

```env
CRON_SECRET=your-secret
```

Vercel only auto-attaches the cron `Authorization` header when the deployed project has `CRON_SECRET` configured. The app also accepts this legacy manual-call alias:

```env
AGENT_TASKS_CRON_SECRET=your-secret
```

The request handler accepts either:
- `Authorization: Bearer <secret>`
- `x-cron-secret: <secret>`

When Notion MCP is configured and `Auto Sync` is enabled in Eco-Loom, each cron run will:
- import recent changes from the mapped Notion databases
- enqueue follow-up automation work
- process the pending agent-task queue in the same scheduled pass

If `Auto Sync` is disabled, cron still drains already queued agent tasks but skips the Notion import step.

If you upgrade to Vercel Pro, you can raise the cron frequency in `vercel.json` for a tighter production loop.

## 7. Important production notes

### Database

Do not use SQLite on Vercel. Neon/Postgres is the correct production path for this repo.

### Auth

Keep this off in production and shared staging:

```env
ECO_LOOM_ENABLE_DEV_BOOTSTRAP=false
```

Use real secrets and tokens. Do not reuse local demo defaults.

### Prisma migrations

This repo currently has no committed Prisma migrations, so `vercel-build` uses `prisma db push`.

Once the schema stabilizes, the recommended next step is:

```bash
npx prisma migrate dev --name init-neon
```

Commit the generated `prisma/migrations` folder, then switch the Vercel build command to:

```bash
npm run db:deploy && next build
```

or update `vercel-build` to use `prisma migrate deploy`.

### PDF generation

The report download route uses Puppeteer. Test PDF generation separately after deploy because serverless environments can require extra Chromium setup.
