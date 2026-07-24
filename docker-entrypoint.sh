#!/bin/sh
set -e

echo "→ Applying database migrations (prisma migrate deploy)…"
node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema /app/prisma/schema.prisma

echo "→ Regenerating legacy redirect map from approved stories…"
node /app/gen-redirects.cjs || echo "⚠ redirect map generation failed — using committed fallback"

echo "→ Starting Next.js server…"
exec node server.js
