/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  transpilePackages: ['@saas/shared', '@saas/ui'],
};

export default nextConfig;
