import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads .env files for CLI commands. In production the
// container already has DATABASE_URL in process.env (injected by Kamal), so we
// only pull in dotenv for local dev — this keeps `dotenv` out of the runtime
// image and lets `migrate deploy` run with just process.env.
if (!process.env.DATABASE_URL) {
  await import("dotenv/config");
}

// The datasource URL is only needed for migrate/introspect commands. `prisma
// generate` (which runs at image-build time with no DATABASE_URL) must not
// require it, so attach the datasource only when the variable is present rather
// than using the eager `env()` helper, which throws on a missing variable.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: { path: path.join("prisma", "migrations") },
  ...(process.env.DATABASE_URL
    ? { datasource: { url: process.env.DATABASE_URL } }
    : {}),
});
