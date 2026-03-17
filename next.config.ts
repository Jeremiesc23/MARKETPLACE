import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "lvh.me", "*.lvh.me", "10.96.5.219"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/sistema_sas/**",
      },
    ],
  },
  output: "standalone",
};

export default nextConfig;
