import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default 1MB is too small for board post attachments (up to 5 files x 5MB).
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
