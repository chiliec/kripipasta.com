"use server";

import { redirect } from "next/navigation";
import { checkPassword } from "@/lib/admin-auth";
import { startAdminSession } from "@/lib/admin-session";

export interface LoginState {
  error?: boolean;
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password, process.env.ADMIN_PASSWORD ?? "")) {
    return { error: true };
  }
  await startAdminSession();
  redirect("/admin");
}
