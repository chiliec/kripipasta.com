import { prisma } from "@/lib/db";
import { runTieredImport } from "../shared/mediawiki";
import { downloadUrl, parseStoryJson } from "./parse";
import { BASE_URL, EXCLUDED_CATEGORIES, TIERS, sourceUrl, tagCategories, tierVotes } from "./select";

runTieredImport({
  source: "creepypasta-wiki",
  apiBase: `${BASE_URL}/api.php`,
  tiers: TIERS,
  tierVotes,
  excludedCategories: EXCLUDED_CATEGORIES,
  topicalMin: 50,
  tagNames: tagCategories,
  parsePage: parseStoryJson,
  sourceUrl,
  imagePrefix: "creepypasta",
  downloadUrl,
  voterNamespace: (pageid) => `creepypasta-wiki:${pageid}`,
})
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
