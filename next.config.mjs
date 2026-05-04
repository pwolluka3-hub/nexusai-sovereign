import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: {
    webpackBuildWorker: false,
  },
  typescript: {
    ignoreBuildErrors: true,
    // Skip type checking during build since we run tsc separately
    // This works around WASM compiler issues on some platforms
    tsconfigPath: './tsconfig.json',
  },
  images: {
    // SECURITY FIX: Restrict to trusted domains only instead of allowing any HTTPS domain
      {
        protocol: 'https',
        hostname: 'extractedproject-theta.vercel.app',
      },
      {
        protocol: 'https',
        hostname: '*.extractedproject-theta.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'puter.com',
      },
      {
        protocol: 'https',
        hostname: '*.puter.com',
      },
      // Add other trusted CDNs as needed
      {
        protocol: 'https',
        hostname: 'cdn.example.com', // Replace with your CDN domain
      },
    ],
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // BUG FIX #3: Harden CSP - remove unsafe-eval, restrict unsafe-inline
            value: [
              "default-src 'self'",
              // Next.js app router injects inline bootstrap scripts for hydration.
              // Without unsafe-inline here, the UI renders but client interactions never bind.
              "script-src 'self' 'unsafe-inline' https://js.puter.com https://cdn.puter.com https://puter.com https://*.puter.com 'wasm-unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "media-src 'self' data: https:",
              "connect-src 'self' https://js.puter.com https://api.puter.com https://puter.com https://*.puter.com https: ws: wss:",
              "frame-src 'self' https://puter.com https://*.puter.com",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://puter.com https://*.puter.com",
              "upgrade-insecure-requests",
            ].join('; ')
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  },
}

export default nextConfig
