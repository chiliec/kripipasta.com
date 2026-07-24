import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle (.next/standalone) for a lean Docker image.
  output: "standalone",
  // Canonicalize www → apex (308). Host-scoped so the proxy healthcheck, which
  // carries a non-www Host, is never redirected and can't deadlock a deploy.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.kripipasta.com" }],
        destination: "https://kripipasta.com/:path*",
        permanent: true,
      },
    ];
  },
};

// Points at src/i18n/request.ts by convention.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
