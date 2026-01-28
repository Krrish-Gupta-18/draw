import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://192.168.1.45:3000"
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
