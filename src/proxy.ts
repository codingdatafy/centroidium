/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * CODINGDATAFY NETWORK PROXY BOUNDARY
 */
export function proxy(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. DIRECTORY & CONTENT PRIVACY SHIELD
  const isAnalyticsRoute = pathname.startsWith('/va/') || pathname.startsWith('/_vercel/');
  const isStaticOrApi = pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.');

  if (!isAnalyticsRoute && !isStaticOrApi) {
    if (
      pathname.endsWith('.md') || 
      pathname.startsWith('/data/') || 
      pathname.includes('/_sidebar')
    ) {
      return new NextResponse(null, { status: 404 });
    }
  }

  // 2. CLOUDFLARE VISITOR IP SYNCHRONIZATION
  const requestHeaders = new Headers(request.headers);
  const cfIp = request.headers.get('cf-connecting-ip');
  
  if (cfIp) {
    requestHeaders.set('x-real-ip', cfIp);
    requestHeaders.set('x-forwarded-for', cfIp);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 3. GLOBAL SECURITY & SEO HEADERS
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Robots-Tag', 'index, follow');
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  return response;
}