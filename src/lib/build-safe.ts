import { PHASE_PRODUCTION_BUILD } from "next/constants";

/**
 * Run a DB-backed read that also executes during `next build`.
 *
 * The production image is compiled by the remote Kamal builder with NO database
 * reachable, so any Prisma query at build time throws. These pages are ISR
 * (`revalidate`), so their content is hydrated at runtime against the real DB;
 * at build we only need an empty shell. Swallow the error and return `fallback`
 * during the build phase, but rethrow at runtime so a genuine DB outage still
 * surfaces (500) instead of silently rendering empty.
 */
export async function buildSafe<T>(
  query: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await query();
  } catch (err) {
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return fallback;
    throw err;
  }
}
