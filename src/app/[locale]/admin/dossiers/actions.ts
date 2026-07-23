"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { isAdmin } from "@/lib/admin-session";
import { validateDossier, type DossierFormInput } from "@/lib/dossier-validate";
import {
  createDossier,
  updateDossier,
  setDossierStatus,
} from "@/lib/dossier-admin";

async function guardAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    const locale = await getLocale();
    redirect({ href: "/admin/login", locale });
  }
}

function readForm(formData: FormData): DossierFormInput {
  const str = (k: string) => String(formData.get(k) ?? "");
  const arr = (k: string) => formData.getAll(k).map((v) => String(v));
  return {
    name: str("name"),
    slug: str("slug"),
    epithet: str("epithet"),
    category: str("category"),
    canonStatus: str("canonStatus"),
    aliases: str("aliases"),
    threatLevel: str("threatLevel"),
    threatScore: str("threatScore"),
    dangerScore: str("dangerScore"),
    firstSurfaced: str("firstSurfaced"),
    origin: str("origin"),
    lead: str("lead"),
    species: str("species"),
    statusText: str("statusText"),
    creator: str("creator"),
    height: str("height"),
    habitat: str("habitat"),
    popularityCaption: str("popularityCaption"),
    sectionHeading: arr("sectionHeading"),
    sectionBody: arr("sectionBody"),
    galleryCaption: arr("galleryCaption").flatMap((v) => v.split(/\r?\n/)).map((s) => s.trim()).filter(Boolean),
    popYear: arr("popYear"),
    popValue: arr("popValue"),
    relatedLines: str("relatedLines"),
  };
}

function revalidateAll(slug: string): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dossier`);
    revalidatePath(`/${locale}/dossier/${slug}`);
    revalidatePath(`/${locale}/admin/dossiers`);
  }
}

export async function saveNewDossier(formData: FormData): Promise<void> {
  await guardAdmin();
  const result = validateDossier(readForm(formData));
  if (!result.ok) return;
  const { slug } = await createDossier(result.data);
  revalidateAll(slug);
  const locale = await getLocale();
  redirect({ href: "/admin/dossiers", locale });
}

export async function saveDossier(formData: FormData): Promise<void> {
  await guardAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const result = validateDossier(readForm(formData));
  if (!result.ok) return;
  const updated = await updateDossier(id, result.data);
  if (updated) revalidateAll(updated.slug);
  const locale = await getLocale();
  redirect({ href: "/admin/dossiers", locale });
}

export async function publishDossier(formData: FormData): Promise<void> {
  await guardAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const result = await setDossierStatus(id, "APPROVED");
  if (result) revalidateAll(result.slug);
}

export async function unpublishDossier(formData: FormData): Promise<void> {
  await guardAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const result = await setDossierStatus(id, "DRAFT");
  if (result) revalidateAll(result.slug);
}
