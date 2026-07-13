import type { NextConfig } from 'next';

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/assets/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3000', pathname: '/assets/**' },
      { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/library/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3000', pathname: '/library/**' },
    ],
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` },
      { source: '/assets/:path*', destination: `${API_ORIGIN}/assets/:path*` },
      { source: '/library/:path*', destination: `${API_ORIGIN}/library/:path*` },
    ];
  },
};

export default nextConfig;
