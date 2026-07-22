"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { validateSubmission } from "@/lib/submission-validate";
import { createSubmission } from "@/lib/submissions";

export interface SubmitState {
  errors?: Record<string, string>;
}

export async function submitStory(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const input = {
    title: String(formData.get("title") ?? ""),
    intro: String(formData.get("intro") ?? ""),
    content: String(formData.get("content") ?? ""),
    authorName: String(formData.get("authorName") ?? ""),
    authorLink: String(formData.get("authorLink") ?? ""),
    authorEmail: String(formData.get("authorEmail") ?? ""),
    tags: String(formData.get("tags") ?? ""),
    website: String(formData.get("website") ?? ""),
  };

  const result = validateSubmission(input);
  if (!result.ok) return { errors: result.errors };

  await createSubmission(result.data);
  return redirect({ href: "/submit/thanks", locale: await getLocale() });
}
