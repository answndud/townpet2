import type { NextConfig } from "next";

import { buildStaticSecurityHeaders } from "./src/lib/security-headers";

const staticSecurityHeaders = buildStaticSecurityHeaders({
  nodeEnv: process.env.NODE_ENV,
  cspEnforceStrict: process.env.CSP_ENFORCE_STRICT,
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: staticSecurityHeaders,
      },
      {
        source: "/api/posts",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=30, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/api/posts/:id/detail",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=30, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/posts/:id/guest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=30, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
