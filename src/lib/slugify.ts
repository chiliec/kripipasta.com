const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** URL-safe slug: lowercases, transliterates Cyrillic, hyphenates the rest. */
export function slugify(input: string): string {
  const lower = input.trim().toLowerCase();
  let out = "";
  for (const ch of lower) out += CYRILLIC[ch] ?? ch;
  const slug = out.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "tag";
}
