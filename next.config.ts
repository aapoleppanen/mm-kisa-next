import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "avatars.githubusercontent.com" },
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "crests.football-data.org" },
      { hostname: "upload.wikimedia.org" },
      { hostname: "storage.googleapis.com" },
      // Cloudflare R2 public bucket (*.r2.dev) and custom domains
      { hostname: "*.r2.dev" },
      { hostname: "pub-*.r2.dev" },
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
