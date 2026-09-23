import type { RequestContext, ProcessedDocument } from '../types';
import { fetchMarkdownFromR2 } from '../services/storage';
import { getCachedResponse, setCachedResponse } from '../services/cache';
import { processMarkdown } from '../lib/markdown';
import { renderPage } from '../templates/page';

/**
 * Route handler for rendering dynamic documentation and core reference pages
 */
export async function handlePageRoute(context: RequestContext): Promise<Response | null> {
  const { request, env, pathname } = context;

  const cachedResponse = await getCachedResponse(request, env);
  if (cachedResponse) {
    return cachedResponse;
  }

  const r2Key = resolveR2Key(pathname);

  const rawMarkdown = await fetchMarkdownFromR2(env.CONTENT_BUCKET, r2Key);

  let contentMarkdown = rawMarkdown;
  if (!contentMarkdown && !pathname.endsWith('/')) {
    const fallbackKey = resolveR2Key(`${pathname}/`);
    contentMarkdown = await fetchMarkdownFromR2(env.CONTENT_BUCKET, fallbackKey);
  }

  if (!contentMarkdown) {
    return null;
  }

  const doc: ProcessedDocument = await processMarkdown(contentMarkdown);

  if (doc.meta['draft'] && env.ENVIRONMENT === 'production') {
    return null;
  }

  const siteUrl = env.SITE_URL || new URL(request.url).origin;
  const cacheTtl = env.DEFAULT_CACHE_TTL || '86400';

  const html = renderPage({
    doc,
    pathname,
    siteName: env.SITE_NAME,
    siteUrl,
  });

  const response = new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': `public, max-age=${cacheTtl}, s-maxage=${cacheTtl}`,
    },
  });

  context.ctx.waitUntil(setCachedResponse(request, response, env));

  return response;
}

/**
 * Resolves a request URL pathname into its corresponding R2 storage object key
 */
function resolveR2Key(pathname: string): string {
  const cleanPath = pathname.replace(/^\/+|\/+$/g, '');

  if (cleanPath === '') {
    return 'index.md';
  }

  if (pathname.endsWith('/')) {
    return `${cleanPath}/index.md`;
  }

  return `${cleanPath}.md`;
}