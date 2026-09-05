import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Blog thumbnails and in-content images are hosted on Cloudinary.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  allowedDevOrigins: ["domestic-scenario-tones-reviewer.trycloudflare.com"],
};

export default nextConfig;
