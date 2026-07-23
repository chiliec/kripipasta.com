import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

// Points at src/i18n/request.ts by convention.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
