/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@azure/storage-blob"],
  },
  images: {
    unoptimized: true, // Disable Next.js image optimization for standalone builds
  },
};

module.exports = nextConfig;
