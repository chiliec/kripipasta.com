import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { sanitizeStoryHtml } from "@/lib/sanitize";
import type { ValidatedSubmission } from "@/lib/submission-validate";

export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let n = 2;
  while (
    await prisma.story.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
}

function tagCreateInput(tagNames: string[]) {
  const bySlug = new Map<string, string>();
  for (const name of tagNames) {
    const slug = slugify(name);
    if (!bySlug.has(slug)) bySlug.set(slug, name);
  }
  return [...bySlug].map(([slug, name]) => ({
    tag: {
      connectOrCreate: {
        where: { slug },
        create: { slug, name },
      },
    },
  }));
}

export async function createSubmission(
  data: ValidatedSubmission,
): Promise<{ id: string; slug: string }> {
  const slug = await generateUniqueSlug(data.title);
  const story = await prisma.story.create({
    data: {
      slug,
      title: data.title,
      intro: data.intro,
      contentHtml: sanitizeStoryHtml(data.contentHtml),
      status: "PENDING",
      language: "ru",
      authorName: data.authorName,
      authorLink: data.authorLink,
      authorEmail: data.authorEmail,
      tags: { create: tagCreateInput(data.tagNames) },
    },
    select: { id: true, slug: true },
  });
  return story;
}
