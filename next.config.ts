import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb", // Increase limit for file uploads
    },
  },
};

export default nextConfig;
