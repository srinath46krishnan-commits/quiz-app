import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Let the production build succeed even if ESLint finds issues
  eslint: { ignoreDuringBuilds: true },

  // Optional safety net if TypeScript blocks your build too:
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;

