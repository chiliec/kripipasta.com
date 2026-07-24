import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer auto-loads .env files for CLI commands. In production the
// container already has DATABASE_URL in process.env (injected by Kamal), so we
// only pull in dotenv for local dev — this keeps `dotenv` out of the runtime
// image and lets `migrate deploy` run with just process.env.
if (!process.env.DATABASE_URL) {
  await import("dotenv/config");
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: { path: path.join("prisma", "migrations") },
  datasource: { url: env("DATABASE_URL") },
});
