#!/bin/sh
set -e

echo "→ Applying database migrations (prisma migrate deploy)…"
# Run from the CLI dir so Prisma auto-loads /opt/prisma-cli/prisma.config.ts
# (which supplies the datasource URL and points at /app/prisma) and so its
# `import "prisma/config"` resolves against the CLI's own node_modules.
(cd /opt/prisma-cli && node node_modules/prisma/build/index.js migrate deploy)

echo "→ Regenerating legacy redirect map from approved stories…"
node /app/gen-redirects.mjs || echo "⚠ redirect map generation failed — using committed fallback"

echo "→ Starting Next.js server…"
exec node server.js
