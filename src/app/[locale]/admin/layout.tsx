import type { Metadata } from "next";
import type { ReactNode } from "react";

// Keep the entire admin area out of search indexes. Child pages set their own
// title but inherit this robots directive unless they override it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
