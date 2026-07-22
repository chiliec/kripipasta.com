export interface SubmissionInput {
  title: string;
  intro: string;
  content: string;
  authorName: string;
  authorLink: string;
  authorEmail: string;
  tags: string;
  website: string;
}

export interface ValidatedSubmission {
  title: string;
  intro: string;
  contentHtml: string;
  authorName: string;
  authorLink: string;
  authorEmail: string;
  tagNames: string[];
}

export type ValidationResult =
  | { ok: true; data: ValidatedSubmission }
  | { ok: false; errors: Record<string, string> };

const LIMITS = {
  titleMin: 3,
  titleMax: 200,
  contentMin: 50,
  contentMax: 100_000,
  introMax: 500,
  nameMax: 120,
  linkMax: 300,
  emailMax: 200,
  tagMax: 40,
  tagCount: 8,
};

const URL_RE = /^https?:\/\/.+/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function textToHtml(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function validateSubmission(input: SubmissionInput): ValidationResult {
  if (input.website.trim() !== "") {
    return { ok: false, errors: { form: "spam" } };
  }

  const title = input.title.trim();
  const intro = input.intro.trim();
  const content = input.content.trim();
  const authorName = input.authorName.trim();
  const authorLink = input.authorLink.trim();
  const authorEmail = input.authorEmail.trim();
  const tagNames = parseTags(input.tags);

  const errors: Record<string, string> = {};
  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax)
    errors.title = "Заголовок должен быть от 3 до 200 символов.";
  if (content.length < LIMITS.contentMin || content.length > LIMITS.contentMax)
    errors.content = "Текст должен быть от 50 до 100 000 символов.";
  if (intro.length > LIMITS.introMax)
    errors.intro = "Вступление не длиннее 500 символов.";
  if (authorName.length > LIMITS.nameMax)
    errors.authorName = "Слишком длинное имя.";
  if (authorLink && (!URL_RE.test(authorLink) || authorLink.length > LIMITS.linkMax))
    errors.authorLink = "Укажите корректную ссылку (http/https).";
  if (authorEmail && (!EMAIL_RE.test(authorEmail) || authorEmail.length > LIMITS.emailMax))
    errors.authorEmail = "Укажите корректный email.";
  if (tagNames.length > LIMITS.tagCount)
    errors.tags = "Не более 8 меток.";
  else if (tagNames.some((t) => t.length > LIMITS.tagMax))
    errors.tags = "Метка не длиннее 40 символов.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      title,
      intro,
      contentHtml: textToHtml(content),
      authorName,
      authorLink,
      authorEmail,
      tagNames,
    },
  };
}
