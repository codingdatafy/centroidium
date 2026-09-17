import { RequestContext } from './types';
import { handlePageRoute } from './handlers/page';
import { handleSitemapRoute } from './handlers/sitemap';
import { handleAnalyticsRoute } from './services/analytics';
import { renderNotFound } from './templates/not-found';

export async function handleRequest(context: RequestContext): Promise<Response> {
  const { request, env, pathname } = context;

  if (pathname === '/lib') {
    return handleAnalyticsRoute(context);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': 'GET, HEAD',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  if (isStaticAsset(pathname)) {
    return env.ASSETS.fetch(request);
  }

  if (pathname === '/sitemap.xml') {
    return handleSitemapRoute(context);
  }

  const pageResponse = await handlePageRoute(context);
  if (pageResponse) {
    return pageResponse;
  }

  const notFoundHtml = renderNotFound({
    siteName: env.SITE_NAME,
    pathname,
  });

  return new Response(notFoundHtml, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function isStaticAsset(pathname: string): boolean {
  if (
    pathname.startsWith('/styles/') ||
    pathname.startsWith('/scripts/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/.well-known/')
  ) {
    return true;
  }

  return (
    pathname === '/robots.txt' ||
    pathname === '/llms.txt' ||
    pathname === '/favicon.ico' ||
    pathname === '/_headers'
  );
}