# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Kripipasta — a Russian-language creepypasta archive, revived on Next.js/Postgres from a legacy PHP site. Public story/dossier reading, voting, submissions + moderation queue, i18n (ru/en), and DB-backed legacy-URL redirects. Deployed on a VPS (axveer) via Kamal behind kamal-proxy.

## Commands

```bash
npm run dev              # next dev
npm run build            # next build (standalone output)
npm run lint             # eslint .
npm run typecheck        # tsc --noEmit
npm run test             # vitest run
npm run test:watch       # vitest (watch mode)
npx vitest run src/lib/scoring/wilson.test.ts   # single test file
npx vitest run -t "name" # single test by name

npm run db:migrate       # prisma migrate dev
npm run db:generate      # prisma generate (client output: src/generated/prisma)
npm run db:studio        # prisma studio

npm run db:migrate:legacy  # tsx src/migrate/run.ts — one-shot ETL from legacy MySQL dump
npm run db:migrate:verify  # tsx src/migrate/verify.ts — post-ETL sanity checks
npm run db:seed:dossiers   # tsx src/seed/dossiers.ts — upserts src/seed/entities/*.ts into DB
npm run recover:images     # tsx src/migrate/recover-images.ts — pulls missing images from Wayback
```

Tests are colocated (`foo.ts` + `foo.test.ts`), run with `vitest`/node environment, no DB — pure functions and transforms are unit-tested directly; DB-touching code is kept thin and pushed to the edges so it doesn't need mocking.

CI (`.github/workflows/main.yml`) runs against a real Postgres 16 service container: lint → typecheck → test → `prisma migrate deploy` → build. Mirror that order locally before pushing.

## Architecture

**Stack**: Next.js 16 (App Router, RSC, `output: "standalone"`), React 19, Prisma 7 (driver adapter — the Rust query engine is gone, `@prisma/adapter-pg` is required, see `src/lib/db.ts`), Postgres, Tailwind v4, `next-intl` for i18n, Vitest.

**Locale routing**: everything public lives under `src/app/[locale]/...`. `src/i18n/routing.ts` defines locales (`ru` default, `en`) with `localePrefix: "always"` — every path is `/ru/...` or `/en/...`, bare `/` redirects to `/ru`.

**Middleware split** (`src/proxy.ts`, Next's `proxy.ts` convention replacing `middleware.ts`): legacy `/story/{id}` paths bypass `next-intl`'s middleware entirely and fall through to the Node route handler at `src/app/story/[id]/route.ts`, which does a live DB lookup (via `src/lib/legacy-redirect.ts`) to 301 to the new slug — this can't be edge/static since the id→slug mapping lives in Postgres. Other legacy section trees (`/forum`, `/sandbox`, etc.) and `/go.php` are pure static 301s to `/ru`, resolved with no DB (`resolveStaticLegacy`). Everything else goes through `next-intl`'s `createMiddleware`.

**Build vs runtime DB access**: the production image is built on a remote builder with no database reachable. Any page that queries the DB at build time must wrap the call in `buildSafe()` (`src/lib/build-safe.ts`), which swallows errors and returns a fallback only when `NEXT_PHASE === PHASE_PRODUCTION_BUILD`, rethrowing at real runtime. Pages doing DB-backed listing without dynamic params (e.g. dossier index) must also be `force-dynamic` — see the git history around PR #92 for why.

**Content model** (`prisma/schema.prisma`): `Story` and `Dossier` are the two publishable entity types (`ContentStatus`: DRAFT/PENDING/APPROVED/REJECTED). Dossiers have child `DossierSection` (ordered rich-text blocks), `DossierImage` (gallery), and `PopularityPoint` (chart data). Both `Story` and `Dossier` carry a generated `tsvector` column (`searchVector`, GIN-indexed) populated by a migration-defined `STORED` generated column — queried only via `$queryRaw` (see `src/lib/search.ts`, `src/lib/stories.ts`, `src/lib/dossiers.ts`). `Vote` is polymorphic over `EntityType` (STORY/DOSSIER) with a Wilson-score aggregate recomputed on every vote (`src/lib/scoring/wilson.ts`, `src/lib/voting.ts`) — likeCount/dislikeCount/score are denormalized onto the entity row for cheap listing/sort. `LegacyArchive` is a JSON dump of legacy tables kept for provenance, not queried by the app.

**Dossier seeding**: dossiers are content-as-code, not admin-authored. Each entity lives in `src/seed/entities/<slug>.ts` (a `SeedDossier` literal — sections as block arrays, gallery, popularity points), registered in `src/seed/entities/index.ts`, and upserted into Postgres by `src/seed/dossiers.ts` (delete-and-recreate children each run, so it's idempotent). `src/seed/dossier-html.ts` renders the block arrays to sanitized HTML.

**Legacy ETL** (`src/migrate/`): one-shot import from the old MySQL dump (`legacy-db.ts` reads it, `transform.ts` maps rows → Prisma shapes, `run.ts` orchestrates). Community-submitted stories with `approved === 2` are deliberately excluded (55% downvote rate — a data-quality call made 2026-07-22, see the comment in `run.ts`). Not re-run in normal development; DB state is a mix of migrated legacy content, seeded dossiers, and live submissions.

**Image handling**: legacy story HTML references `/images/<name>` paths recovered piecemeal from the Wayback Machine into `public/images/`; not all were recoverable. `src/lib/available-images.ts` checks file presence at render time and strips `<img>` tags whose local file is missing, rather than tracking a static "known missing" list — so dropping a recovered file into `public/images/` makes it reappear automatically.

**Auth**: no user accounts. Admin moderation (`src/app/[locale]/admin/**`) is a single shared password (`ADMIN_PASSWORD`) plus an HMAC session cookie (`sessionToken = HMAC-SHA256(ADMIN_SESSION_SECRET, "admin")`, constant-time compared) — see `src/lib/admin-auth.ts` / `src/lib/admin-session.ts`. Voting is anonymized per-browser via a `voterId` cookie (`src/lib/voter-session.ts`), not tied to any account.

**Sanitization**: all user- and legacy-sourced HTML (story bodies, dossier sections) is passed through `src/lib/sanitize.ts` (`sanitize-html`) before storage/render — never trust `contentHtml`/`bodyHtml` as pre-sanitized just because it's already in the DB from the ETL.

**Deploy**: Docker image built remotely (`builder.remote: ssh://axveer-builder` in `config/deploy.yml`, since the box can't cross-build amd64 locally) and shipped via Kamal to a single VPS behind kamal-proxy, which terminates TLS and does host-based routing. `/api/health` is DB-backed and deliberately excluded from the i18n proxy matcher so the healthcheck's non-www Host header is never redirected. `next.config.ts` 308-redirects `www` → apex, scoped by `host` header for the same reason. Secrets (`DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`) come from Kamal's secret env, sourced from a SOPS-encrypted file — not committed.
