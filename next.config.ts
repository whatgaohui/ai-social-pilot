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
  // Force server restart to pick up Prisma schema changes
  serverExternalPackages: ["@prisma/client", "@prisma/engines"],
};

export default nextConfig;
