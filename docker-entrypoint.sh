#!/bin/sh
set -e

echo "→ Applying database migrations (prisma migrate deploy)…"
node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema /app/prisma/schema.prisma

echo "→ Starting Next.js server…"
exec node server.js
