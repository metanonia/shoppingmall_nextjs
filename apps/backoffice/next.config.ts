import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default 1MB is too small for goods/banner/popup image uploads.
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
