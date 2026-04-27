/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    // Required for Cloudflare Pages compatibility
    workerThreads: false,
  },
};

module.exports = nextConfig;
