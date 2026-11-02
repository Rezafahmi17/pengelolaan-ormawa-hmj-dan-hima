import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  transpilePackages: ['@sim-ormawa/contracts'],
  // Fix Turbopack workspace root resolution in monorepo
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },

  async rewrites() {
    const internalApiUrl = (process.env.INTERNAL_API_URL ?? 'http://localhost:4000').replace(
      /\/+$/,
      '',
    );
    return [
      {
        source: '/api/v1/:path*',
        destination: `${internalApiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
