import { RequestContext } from '../types';
import { listAllContentKeys } from '../services/storage';
import { getCachedResponse, setCachedResponse } from '../services/cache';

/**
 * Route handler for dynamic sitemap.xml generation directly from Cloudflare R2
 */
export async function handleSitemapRoute(context: RequestContext): Promise<Response> {
  const { request, env } = context;

  const cachedResponse = await getCachedResponse(request, env);
  if (cachedResponse) {
    return cachedResponse;
  }

  const keys = await listAllContentKeys(env.CONTENT_BUCKET);

  const urlNodes = keys
    .map((key) => {
      const routePath = convertKeyToPath(key);
      const loc = `${env.SITE_URL}${routePath}`;
      return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${routePath === '/' ? '1.0' : '0.8'}</priority>\n  </url>`;
    })
    .join('\n');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlNodes}\n</urlset>`;

  const response = new Response(xmlContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${env.DEFAULT_CACHE_TTL}, s-maxage=${env.DEFAULT_CACHE_TTL}`,
    },
  });

  context.ctx.waitUntil(setCachedResponse(request, response, env));

  return response;
}

/**
 * Converts R2 storage object keys back into public URL pathnames
 */
function convertKeyToPath(key: string): string {
  if (key === 'index.md') {
    return '/';
  }

  if (key.endsWith('/index.md')) {
    return `/${key.replace(/\/index\.md$/, '/')}`;
  }

  if (key.endsWith('.md')) {
    return `/${key.replace(/\.md$/, '')}`;
  }

  return `/${key}`;
}