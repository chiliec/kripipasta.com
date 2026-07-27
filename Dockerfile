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
# The Prisma 7 client is engineless TS bundled into the standalone server output,
# but the standalone trace stubs the @prisma packages (client runtime + wasm query
# compiler) down to bare package.json files — copy the full tree so the runtime
# DB routes (e.g. the legacy /story/[id] redirect) resolve it at request time.
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

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
