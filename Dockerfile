# syntax=docker/dockerfile:1

# ── Builder: install all deps, generate the Prisma client, build standalone ──
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# OpenSSL is required by the Prisma query engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# Generate the Prisma 7 client into src/generated/prisma. Needs the full source
# (schema + prisma.config.ts), so it must run after `COPY . .`.
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Bundle the redirect-map generator so it can be run with plain node at startup.
# --tsconfig resolves the @/ path alias (incl. the generated client, which gets
# bundled in). @prisma/adapter-pg is bundled IN because its `postgres-array` dep
# is inlined into Next's webpack server chunks — the standalone trace copies only
# a stub package.json for it, so keeping the adapter external would fail to
# resolve postgres-array/index.js at startup. pg stays external: it's CommonJS
# and dynamic-requires Node builtins (events/net/tls), which esbuild's ESM output
# can't shim; it's traced complete into the standalone node_modules. @prisma/client
# stays external too and resolves from the full @prisma tree copied below. ESM
# output (not CJS) so `import.meta.url` used by bundled deps resolves at runtime.
RUN ./node_modules/.bin/esbuild --bundle --platform=node --format=esm \
  --tsconfig=tsconfig.json \
  --external:@prisma/client \
  --external:pg \
  --outfile=/app/gen-redirects.mjs \
  src/build/gen-legacy-redirects.ts

# ── Runner: minimal standalone image + Prisma CLI for `migrate deploy` ──
FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Next.js standalone server + static assets.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma schema + migrations for `migrate deploy`.
COPY --from=builder /app/prisma ./prisma
# The Prisma 7 client is engineless TS bundled into the standalone server output.
# The redirect-gen script (gen-redirects.mjs) keeps only @prisma/client external
# (its `runtime/client` + wasm query compiler), so copy the full @prisma tree —
# the standalone trace stubs these to bare package.json files otherwise.
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI with its FULL dependency closure, installed into an isolated prefix so
# `migrate deploy` runs at startup and npm can't prune the slim standalone
# node_modules. Keep the version in sync with package.json's prisma devDependency.
# Prisma 7 needs a config file for the datasource URL (removed from schema.prisma);
# placing it alongside the CLI makes `prisma/config` resolvable when the entrypoint
# runs `migrate deploy` from this directory.
RUN mkdir -p /opt/prisma-cli \
  && cd /opt/prisma-cli \
  && npm init -y >/dev/null 2>&1 \
  && npm install prisma@7.9.0 >/dev/null 2>&1 \
  && printf '%s\n' \
    'import { defineConfig, env } from "prisma/config";' \
    'export default defineConfig({' \
    '  schema: "/app/prisma/schema.prisma",' \
    '  migrations: { path: "/app/prisma/migrations" },' \
    '  datasource: { url: env("DATABASE_URL") },' \
    '});' > /opt/prisma-cli/prisma.config.ts

COPY --from=builder /app/gen-redirects.mjs ./gen-redirects.mjs

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
