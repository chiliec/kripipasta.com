import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ru", "en"],
  defaultLocale: "ru",
  // Both locales are prefixed: "/ru/...", "/en/...". Bare "/" redirects to "/ru".
  // To keep RU unprefixed instead, change this to "as-needed" (see plan Key Decisions).
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
