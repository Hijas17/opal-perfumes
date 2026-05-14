import type { NextConfig } from 'next'

const uploadsHost = (process.env.NEXT_PUBLIC_UPLOADS_URL || 'http://localhost:8000/uploads')
  .replace(/^https?:\/\//, '')
  .split('/')[0]
const [hostname, port] = uploadsHost.split(':')

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow next/image to optimise images served by the PHP API
  images: {
    // Local dev: PHP API on http://localhost:8000
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: hostname || 'localhost',
        port: port || '8000',
        pathname: '/uploads/**',
      },
      // Production placeholder — adjust when domain is live
      {
        protocol: 'https',
        hostname: 'opalperfumes.com',
        pathname: '/uploads/**',
      },
      // External images allowed (e.g. Google Drive bulk import results)
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },

  // Performance
  compress: true,
  poweredByHeader: false,
}

export default nextConfig
