import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server mode: API routes backed by Neon PostgreSQL handle all data.
  // images.unoptimized is kept since we don't rely on Vercel's image optimizer.
  images: { unoptimized: true },
  experimental: { agentUpgrade: "security" },
};

export default nextConfig;
