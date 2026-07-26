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
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  // 1. ADVANCED EDGE BOT BLOCKER FOR ANALYTICS ROUTES
  const isAnalyticsRoute = pathname.startsWith('/va/') || pathname.startsWith('/_vercel/');
  
  if (isAnalyticsRoute) {
    const isKnownBot = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefsbot|semrushbot|gptbot|chatgpt|claudebot|coherebot|headlesschrome|python|node-fetch|axios/i.test(userAgent);
    if (isKnownBot) {
      return new NextResponse(null, { status: 204 });
    }
  }

  // 2. DIRECTORY & CONTENT PRIVACY SHIELD
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

  // 3. CLOUDFLARE VISITOR IP SYNCHRONIZATION
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

  // 4. GLOBAL SECURITY & SEO HEADERS
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Robots-Tag', 'index, follow');
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  return response;
}