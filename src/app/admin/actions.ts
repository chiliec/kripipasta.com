"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, endAdminSession } from "@/lib/admin-session";
import { setStoryStatus } from "@/lib/moderation";

export async function approveStory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { slug } = await setStoryStatus(id, "APPROVED");
  revalidatePath("/");
  revalidatePath(`/story/${slug}`);
  revalidatePath("/admin");
}

export async function rejectStory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setStoryStatus(id, "REJECTED");
  revalidatePath("/admin");
}

export async function logout(): Promise<void> {
  await requireAdmin();
  await endAdminSession();
  redirect("/admin/login");
}
