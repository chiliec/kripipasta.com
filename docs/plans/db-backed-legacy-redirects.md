# Plan: DB-backed (live) legacy `/story/{id}` redirects

**Status:** Not started. Written 2026-07-25 for execution in a fresh session.
**Branch to create:** `feature/db-backed-redirects` (off `master`).
**Size:** Medium. Touches the Edge/Node runtime boundary, Dockerfile, entrypoint, and prod deploy.

---

## Problem

The legacy redirect map is **frozen at image-build time**, so newly-approved
classics keep 410-ing on their old `/story/{id}` URLs until a full rebuild+redeploy.

Root cause chain:
- `src/proxy.ts` runs in the **Edge middleware runtime** and *statically imports*
  `data/legacy-redirects.json` (baked into the webpack bundle at build time).
- `docker-entrypoint.sh` runs `node /app/gen-redirects.mjs` at container start to
  regenerate the JSON, but **nothing reads the regenerated file** — the running
  server holds the build-time copy. It also can't write: `USER node` → `EACCES` on
  `/app/data`. So the regen step is a silent no-op.
- Net effect: approve a story in `/admin` → its `/story/{legacyId}` URL returns
  **410 Gone** until the next image rebuild.

`Story.legacyId Int? @unique` (schema.prisma:46) already exists, so the live lookup
is trivial: `findUnique({ where: { legacyId }, select: { slug, status } })`.

## Decision (locked)

- **Approach:** Split Edge (static rules) from Node (DB lookup). A new **Node route
  handler** owns `/story/{id}` resolution with live Prisma access. Chosen over a
  middleware→internal-API `fetch()` (no extra hop, Prisma runs natively).
- **Fallback:** **Fully retire** the build-time JSON map + gen script + Dockerfile
  bundling + entrypoint regen. No Edge fallback kept. If the DB is down,
  `/story/{id}` errors like any other dynamic route (acceptable).

---

## Target architecture

### Edge `src/proxy.ts` — static rules only (no DB)
- Keeps: `/go.php` → `301 /ru`; section paths (`/sandbox`, `/forum`, `/film`,
  `/deep`, `/video`, `/image`, `/kurdstory`) → `301 /ru`.
- For `/story/*`: **stop resolving**; return `NextResponse.next()` so the request
  reaches the Node route. Critical: do NOT let `handleI18n` run for `/story/*` —
  with `localePrefix: "always"` next-intl would 307 `/story/123` → `/ru/story/123`
  before our route sees it.
- Drop the `import redirectMap from "../data/legacy-redirects.json"` and the
  `approvedSlugById` Map construction entirely.

### New Node route `src/app/story/[id]/route.ts`
```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```
- `GET(req, { params })`: parse the numeric legacy id from `params.id` using the
  existing `STORY_RE` (handles `123`, `123-slug`, `123-slug.html`).
- If unparseable → themed `410`.
- Else `prisma.story.findUnique({ where: { legacyId: id }, select: { slug: true, status: true } })`
  via the `src/lib/db.ts` singleton.
  - `status === "APPROVED"` → `NextResponse.redirect(new URL('/ru/story/'+slug, req.url), 301)`.
  - otherwise (not found, PENDING, REJECTED) → themed `410`.
- Reuse the existing themed `GONE_HTML` (extract it — see refactor below).
- Consider `Cache-Control: public, max-age=3600` on the 301 (redirects are cheap to
  cache; keeps crawler load off the DB) and a short/no cache on 410. Tuning, not blocking.

> Verify no route collision: top-level `/story/[id]` (no locale) vs. the real
> `/[locale]/story/[slug]` pages are separate trees — fine. Sanity-check the build
> output lists both.

### Refactor `src/lib/legacy-redirect.ts` for testability
Split the current single pure function into:
- `parseLegacyStoryId(pathname): number | null` — pure, used by the Node route.
- `resolveStaticLegacy(pathname): LegacyResolution` — pure, Edge-only (go.php +
  sections + trailing-slash normalize). No longer takes a slug map.
- Keep `STORY_RE`, `LEGACY_SECTIONS` here (shared, edge-safe).
- Extract `GONE_HTML` + `goneResponse()` into a shared module (e.g.
  `src/lib/legacy-gone.ts`) so both proxy.ts (edge) and the route (node) reuse it.
  Confirm the HTML string is runtime-agnostic (it is — plain string).

### Retire build-time machinery (full cleanup)
- Delete `data/legacy-redirects.json`.
- Delete `src/build/gen-legacy-redirects.ts` and `src/build/gen-legacy-redirects.test.ts`.
- `Dockerfile`: remove the esbuild bundling of `gen-redirects.mjs` (around lines
  21, 35–36, the comment at 58, and the `COPY … gen-redirects.mjs` at 81).
- `docker-entrypoint.sh`: remove the "Regenerating legacy redirect map…" block
  (lines 10–11). Keep `migrate deploy` and `exec node server.js`.
- Remove now-unused deps only if nothing else uses them (esbuild is still used as a
  devDep elsewhere? check — the dep-update memory added it explicitly for this step;
  confirm before removing). Do NOT remove `@prisma/adapter-pg`/`pg` (runtime deps).

---

## Tests
- Keep/adapt pure unit tests for `resolveStaticLegacy` (go.php, sections,
  passthrough, trailing slash) and add `parseLegacyStoryId` cases
  (`123`, `123-slug`, `123-slug.html`, `/story`, garbage → null).
- New route-handler test: mock `src/lib/db.ts`, assert 301 location for APPROVED,
  410 for PENDING/not-found, 410 for unparseable id.
- Remove the deleted gen-script test.
- Full gate: `npm run typecheck && npm run lint && npm test && npm run build`.

## Manual / prod verification
- Local: start against seeded DB; `curl -i` `/story/1` (→ 301 `/ru/story/smile-dog`),
  a PENDING id (→ 410), `/go.php` (→ 301 `/ru`), a section (→ 301 `/ru`).
- **Live-freshness test** (the whole point): approve a PENDING story in `/admin`,
  then immediately hit its `/story/{legacyId}` → should 301 with **no redeploy**.
- Deploy via `kamal deploy` (single host, no staging — see
  [[project-deploy-axveer-kamal]]). Watch entrypoint logs: `migrate deploy` clean,
  **no** redirect-regen line, **no** EACCES noise. Smoke-test the 4 behaviors on
  kripipasta.com.

## Risks / gotchas
1. **i18n interception** is the #1 trap — middleware must return
   `NextResponse.next()` for `/story/*`, not fall through to `handleI18n`.
2. **Matcher**: `/story/:path*` is already in `proxy.ts` config — keep it so the
   middleware runs and can choose passthrough; the Node route then handles it.
3. Confirm Edge bundle no longer imports Prisma or the JSON (build will fail loudly
   if a Node-only import leaks into `proxy.ts`).
4. `.html` in the dynamic segment: verify Next matches `/story/123-slug.html` to the
   `[id]` route (single segment — should be fine; the old middleware matcher needed
   the explicit `/story/:path*` entry because of the dotfile exclusion).

## Definition of done
- Approving a story makes its legacy URL 301 immediately, no redeploy.
- No `data/legacy-redirects.json`, no gen script, no entrypoint regen, no EACCES.
- All gates green; prod smoke-tested; memory `project-nocturne-plan1-complete`
  updated (remove "DB-backed redirects" from backlog).
