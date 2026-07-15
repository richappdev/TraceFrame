import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@antiable/bangumi", "@antiable/anitabi", "@antiable/presence"],
  serverExternalPackages: ["node:sqlite"],
};

export default nextConfig;
