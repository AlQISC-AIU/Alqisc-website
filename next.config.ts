import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The optimizer refuses local addresses, so serve emulator images as-is.
    unoptimized: !!process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    qualities: [70, 75, 80, 85, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // Local Storage emulator (npm run dev:emulators).
      ...(process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST
        ? [{ protocol: "http" as const, hostname: process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST, port: "9199" }]
        : []),
    ],
  },
};

export default nextConfig;
