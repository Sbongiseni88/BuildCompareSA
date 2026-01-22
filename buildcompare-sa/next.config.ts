import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8000/api/v1/:path*',
      },
      {
        source: '/rag/:path*',
        destination: 'http://127.0.0.1:8000/rag/:path*',
      },
      {
        source: '/calc/:path*',
        destination: 'http://127.0.0.1:8000/calc/:path*',
      },
    ];
  },
};

export default nextConfig;
