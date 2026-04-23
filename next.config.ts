import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow cross-origin requests from agent-browser and preview URLs
  allowedDevOrigins: [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ],
  // Allow all cross-origin in dev for preview iframe
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS" },
        ],
      },
    ];
  },
  // Force server restart to pick up Prisma schema changes
  serverExternalPackages: ["@prisma/client", "@prisma/engines"],
};

export default nextConfig;
