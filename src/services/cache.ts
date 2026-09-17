import { Env } from '../types';

/**
 * Attempts to retrieve a cached Response object from the Cloudflare Cache API.
 */
export async function getCachedResponse(
  request: Request,
  env: Env
): Promise<Response | null> {
  if (env.ENVIRONMENT !== 'production') {
    return null;
  }

  try {
    const cache = caches.default;
    const cacheKey = createCacheKey(request);
    const cachedResponse = await cache.match(cacheKey);

    if (!cachedResponse) {
      return null;
    }

    const response = new Response(cachedResponse.body, cachedResponse);
    response.headers.set('X-Cache-Status', 'HIT');
    return response;
  } catch (error: unknown) {
    console.error('[Cache API Error] Read failed:', error);
    return null;
  }
}

/**
 * Asynchronously stores a generated Response object into the Cloudflare Cache API.
 */
export async function setCachedResponse(
  request: Request,
  response: Response,
  env: Env
): Promise<void> {
  if (env.ENVIRONMENT !== 'production') {
    return;
  }

  if (response.status !== 200) {
    return;
  }

  try {
    const cache = caches.default;
    const cacheKey = createCacheKey(request);

    const responseToCache = response.clone();
    const headers = new Headers(responseToCache.headers);
    headers.set('X-Cache-Status', 'MISS');

    const cacheableResponse = new Response(responseToCache.body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers,
    });

    await cache.put(cacheKey, cacheableResponse);
  } catch (error: unknown) {
    console.error('[Cache API Error] Write failed:', error);
  }
}

/**
 * Generates a normalized Request cache key URL without query string variations.
 */
function createCacheKey(request: Request): Request {
  const url = new URL(request.url);
  
  let cleanPath = url.pathname;
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }

  const cacheUrl = `${url.protocol}//${url.hostname}${cleanPath}`;
  return new Request(cacheUrl, { method: 'GET' });
}