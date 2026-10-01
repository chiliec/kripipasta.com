import { prisma } from "@/lib/db";
import { runTieredImport } from "../shared/mediawiki";
import { downloadUrl, parseStoryJson } from "./parse";
import { BASE_URL, EXCLUDED_CATEGORIES, TIERS, sourceUrl, tagNames, tierVotes } from "./select";

runTieredImport({
  source: "trollpasta",
  apiBase: `${BASE_URL}/w/api.php`,
  tiers: TIERS,
  tierVotes,
  excludedCategories: EXCLUDED_CATEGORIES,
  topicalMin: null,
  tagNames,
  parsePage: parseStoryJson,
  sourceUrl,
  imagePrefix: "trollpasta",
  downloadUrl,
  voterNamespace: (pageid) => `trollpasta:${pageid}`,
})
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
