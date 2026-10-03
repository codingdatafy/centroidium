import type { Env, RequestContext } from './types';
import { handleRequest } from './router';
import { renderError } from './templates/error';

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

    // Attach Client Hints and performance headers
    const newHeaders = new Headers(response.headers);

    newHeaders.set(
      'Accept-CH',
      'sec-ch-ua-platform-version, sec-ch-ua-platform, sec-ch-ua-mobile, sec-ch-ua-model'
    );

    // Development Environment Overrides
    if (env.ENVIRONMENT === 'development') {
      newHeaders.set('X-Robots-Tag', 'noindex, nofollow');
      newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

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