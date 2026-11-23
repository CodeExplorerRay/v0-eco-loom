# Eco-Loom

[![Latest release](https://img.shields.io/github/v/release/CodeExplorerRay/v0-eco-loom)](https://github.com/CodeExplorerRay/v0-eco-loom/releases)
[![Production](https://img.shields.io/website?url=https%3A%2F%2Feco-loom-esg.vercel.app&label=production)](https://eco-loom-esg.vercel.app)

An ESG operations platform for carbon data, reporting, goals, and sustainability workflows.

## Stack

- Next.js 16 App Router, React, TypeScript, Tailwind CSS
- PostgreSQL with Prisma
- Blog content in Markdown under `docs/blog-seo-pack/posts/`

## Local development

Requirements: Node.js 20.9 or newer, npm, and a PostgreSQL database.

```bash
cp .env.example .env
```

Set valid `DATABASE_URL` and `DIRECT_URL` values and replace the secret placeholders in `.env`. Install dependencies, prepare the local database, and start the app:

```bash
npm ci
npm run db:generate
npm run db:push
npm run dev
```

The development server runs at [http://localhost:3001](http://localhost:3001). `db:push` syncs the Prisma schema without creating migration files; use it only with a development database.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Check TypeScript types |
| `npm run build` | Create the production standalone build |
| `npm start` | Run the standalone build |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:push` | Sync the Prisma schema to a development database |

## Project map

- `src/app/` — pages, layouts, and API routes
- `src/components/` — shared and feature UI
- `src/lib/` — application, database, and server utilities
- `prisma/schema.prisma` — PostgreSQL data model
- `docs/blog-seo-pack/posts/` — source Markdown for blog articles

Add articles as Markdown files in the posts directory; the blog and `/sitemap.xml` are generated from that collection.

## Deployment

Merges to `main` deploy through Vercel. Production: [eco-loom-esg.vercel.app](https://eco-loom-esg.vercel.app).
