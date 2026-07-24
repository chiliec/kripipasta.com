# syntax=docker/dockerfile:1

# ── Builder: install all deps, generate the Prisma client, build standalone ──
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# OpenSSL is required by the Prisma query engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Bundle the redirect-map generator so it can be run with plain node at startup.
RUN ./node_modules/.bin/esbuild --bundle --platform=node --format=cjs \
  --external:@prisma/client \
  --outfile=/app/gen-redirects.cjs \
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
# Runtime Prisma client + query engine (belt-and-suspenders over standalone tracing).
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Prisma CLI with its FULL dependency closure (incl. the hoisted `effect` dep of
# @prisma/config), installed into an isolated prefix so `migrate deploy` runs at
# startup and npm can't prune the slim standalone node_modules. Keep the version
# in sync with package.json's prisma devDependency.
RUN mkdir -p /opt/prisma-cli \
  && cd /opt/prisma-cli \
  && npm init -y >/dev/null 2>&1 \
  && npm install prisma@6.19.3 >/dev/null 2>&1

COPY --from=builder /app/gen-redirects.cjs ./gen-redirects.cjs

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
