import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@antiable/bangumi", "@antiable/anitabi", "@antiable/presence"],
};

export default nextConfig;
