import type { NextConfig } from 'next';

const BACKEND_ORIGIN = process.env.BACKEND_URL || 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
