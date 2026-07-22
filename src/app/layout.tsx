import "./globals.css";
import type { ReactNode } from "react";

// The real <html>/<body> live in app/[locale]/layout.tsx so the lang attribute
// can reflect the active locale. This root layout only satisfies Next's
// requirement for a top-level layout and imports global styles once.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
