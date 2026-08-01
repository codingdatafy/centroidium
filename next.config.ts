/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 1. CORE PERFORMANCE & OPTIMIZATION
  reactStrictMode: true,
  poweredByHeader: false,
  reactCompiler: false,

  // 2. TURBOPACK CONFIGURATION
  turbopack: {
    resolveAlias: {
      fs: { browser: './empty.ts' },
    },
  },

  // 3. EXPERIMENTAL FEATURES
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  // 4. IMAGE OPTIMIZATION
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 14400,
    qualities: [75],
    maximumRedirects: 3,
    dangerouslyAllowLocalIP: false,
    localPatterns: [
      {
        pathname: '/images/**',
        search: '',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
    ],
  },

  // 5. SECURITY & EDGE CACHING HEADERS
  async headers() {
    return [
      // 5.1. Standard Global Security Headers for ALL Routes
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // 5.2. Edge Cache Control Headers ONLY for Valid Dynamic Content Routes
      {
        source: '/((?!_next/|api/|favicon.ico|images/|styles/|scripts/|404|not-found).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=59' },
        ],
      },
    ];
  },

  // 6. PROXY REWRITES FOR ANALYTICS SHIELDING
  async rewrites() {
    return {
      beforeFiles: [
        // PROXY FOR VERCEL ANALYTICS SHIELDING
        {
          source: '/va/lib.js',
          destination: 'https://va.vercel-scripts.com/v1/script.js',
        },
        {
          source: '/va/:path*',
          destination: 'https://va.vercel-scripts.com/v1/:path*',
        },
      ],
    };
  },
};

export default nextConfig;