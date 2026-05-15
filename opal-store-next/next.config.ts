import type { NextConfig } from 'next'

// Parse the uploads URL into protocol/hostname/port for next/image remotePatterns.
// Works for both local dev (http://localhost:8000/uploads) and production
// (https://opal-api.fly.dev/uploads).
const uploadsUrl = process.env.NEXT_PUBLIC_UPLOADS_URL || 'http://localhost:8000/uploads'
let protocol: 'http' | 'https' = 'http'
let hostname = 'localhost'
let port: string | undefined = '8000'
try {
  const u = new URL(uploadsUrl)
  protocol = u.protocol.replace(':', '') === 'https' ? 'https' : 'http'
  hostname = u.hostname
  port = u.port || undefined
} catch {
  /* fall through to defaults */
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow next/image to optimise images served by the PHP API
  images: {
    // Required for the localhost dev API. Safe in prod since prod uses a public hostname.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      // The configured API host (local or production)
      { protocol, hostname, ...(port ? { port } : {}), pathname: '/uploads/**' },
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
