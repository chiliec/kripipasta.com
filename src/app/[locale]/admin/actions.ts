"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { requireAdmin, endAdminSession } from "@/lib/admin-session";
import { setStoryStatus } from "@/lib/moderation";

export async function approveStory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const result = await setStoryStatus(id, "APPROVED");
  if (!result) return; // already approved/rejected — no-op
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/story/${result.slug}`);
    revalidatePath(`/${locale}/admin`);
  }
}

export async function rejectStory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const result = await setStoryStatus(id, "REJECTED");
  if (!result) return; // already approved/rejected — no-op
  for (const locale of routing.locales) revalidatePath(`/${locale}/admin`);
}

export async function logout(): Promise<void> {
  await requireAdmin();
  await endAdminSession();
  const locale = await getLocale();
  redirect({ href: "/admin/login", locale });
}
