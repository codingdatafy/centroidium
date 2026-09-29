import type { Env, RequestContext } from './types';
import { handleRequest } from './router';
import { renderError } from './templates/error';

const DISALLOWED_PERMISSIONS_FEATURES = [
  'attribution-reporting',
  'private-aggregation',
  'join-ad-interest-group',
  'run-ad-auction',
];

export default {
  /**
   * Main entry point for the Cloudflare Worker runtime (workerd)
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const startTime = performance.now();
    const url = new URL(request.url);

    const requestContext: RequestContext = {
      request,
      env,
      ctx,
      url,
      pathname: url.pathname,
      startTime,
      cacheStatus: 'BYPASS',
    };

    let response: Response;

    try {
      response = await handleRequest(requestContext);
    } catch (error: unknown) {
      console.error(`[Unhandled Engine Error] ${url.pathname}:`, error);

      const errorHtml = renderError({
        statusCode: 500,
        message: 'Internal Engine Error',
        siteName: env.SITE_NAME,
      });

      response = new Response(errorHtml, {
        status: 500,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, must-revalidate',
        },
      });
    }

    const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));

    // Clean up permissions policy & attach Client Hints headers
    const newHeaders = new Headers(response.headers);
    const existingPolicy = newHeaders.get('permissions-policy');
    const defaultPolicy = 'camera=(), microphone=(), geolocation=(), ch-ua-platform-version=(self)';

    if (existingPolicy) {
      const cleanPolicy = existingPolicy
        .split(',')
        .map((directive) => directive.trim())
        .filter((directive) => {
          if (!directive) return false;
          const lowerDirective = directive.toLowerCase();
          return !DISALLOWED_PERMISSIONS_FEATURES.some((feature) =>
            lowerDirective.includes(feature)
          );
        })
        .join(', ');

      newHeaders.set('permissions-policy', cleanPolicy || defaultPolicy);
    } else {
      newHeaders.set('permissions-policy', defaultPolicy);
    }

    newHeaders.set(
      'Accept-CH',
      'sec-ch-ua-platform-version, sec-ch-ua-platform, sec-ch-ua-mobile, sec-ch-ua-model'
    );

    const resolvedCacheStatus = newHeaders.get('X-Cache-Status') || requestContext.cacheStatus;
    newHeaders.set('X-Cache-Status', resolvedCacheStatus);
    newHeaders.set('X-Execution-Time-Ms', executionTimeMs.toString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};