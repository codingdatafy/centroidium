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

  // 1. SKIP STATIC ASSETS AND CORE FRAMEWORK ROUTES FOR EFFICIENCY
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. DIRECTORY & CONTENT PRIVACY SHIELD
  if (
    pathname.endsWith('.md') || 
    pathname.startsWith('/data/') || 
    pathname.includes('/_sidebar')
  ) {
    return new NextResponse(null, { status: 404 });
  }

  // 3. CLOUDFLARE VISITOR IP SYNCHRONIZATION
  const requestHeaders = new Headers(request.headers);
  const cfIp = request.headers.get('cf-connecting-ip');
  
  if (cfIp) {
    requestHeaders.set('x-real-ip', cfIp);
    requestHeaders.set('x-forwarded-for', cfIp);
  }

  // Pass modified headers cleanly down the routing chain
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 4. GLOBAL SECURITY & SEO HEADERS
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Robots-Tag', 'index, follow');
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  return response;
}