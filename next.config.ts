import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Force server restart to pick up Prisma schema changes
  serverExternalPackages: ["@prisma/client", "@prisma/engines"],
};

export default nextConfig;
