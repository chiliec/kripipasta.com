import type { Metadata } from "next";
import AdminLoginForm from "@/components/AdminLoginForm";
import { copy } from "@/lib/ui-copy";

export const metadata: Metadata = {
  title: copy.admin.loginHeading,
  robots: { index: false },
};

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6">
      <h1 className="font-serif text-[32px] font-medium text-ink">
        {copy.admin.loginHeading}
      </h1>
      <AdminLoginForm />
    </main>
  );
}
