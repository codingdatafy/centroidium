/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 1. CORE PERFORMANCE & NEXT.JS 16 CACHE COMPONENTS
  reactStrictMode: true,
  poweredByHeader: false,
  reactCompiler: false,
  cacheComponents: true,

  // 2. CLOUDFLARE INTEGRATION SECURITY
  skipProxyUrlNormalize: true,

  // 3. TURBOPACK CONFIGURATION
  turbopack: {
    resolveAlias: {
      fs: { browser: './empty.ts' }
    },
  },

  // 4. EXPERIMENTAL FEATURES
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  // 5. IMAGE OPTIMIZATION
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
    ],
  },

  // 6. SECURITY & EDGE CACHING HEADERS
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=59' },
        ],
      },
    ];
  },

  // 7. PROXY REWRITES FOR ANALYTICS SHIELDING
  async rewrites() {
    return {
      beforeFiles: [
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