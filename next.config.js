/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Electron packaging — bundles Next.js as a self-contained server
  // NEVER change this to "export" — API routes and server components require standalone
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.clerk.com" },
    ],
  },
};

module.exports = nextConfig;
