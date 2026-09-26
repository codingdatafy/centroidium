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
    const url = new URL(request.url);

    const requestContext: RequestContext = {
      request,
      env,
      ctx,
      url,
      pathname: url.pathname,
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

    // Clean up permissions policy
    const newHeaders = new Headers(response.headers);
    const existingPolicy = newHeaders.get('permissions-policy');

    if (existingPolicy) {
      const cleanPolicy = existingPolicy
        .split(',')
        .map((directive) => directive.trim())
        .filter(
          (directive) =>
            !directive.startsWith('attribution-reporting') &&
            !directive.startsWith('private-aggregation') &&
            !directive.startsWith('join-ad-interest-group') &&
            !directive.startsWith('run-ad-auction')
        )
        .join(', ');

      if (cleanPolicy) {
        newHeaders.set('permissions-policy', cleanPolicy);
      } else {
        newHeaders.delete('permissions-policy');
      }
    } else {
      newHeaders.set(
        'permissions-policy',
        'camera=(), microphone=(), geolocation=(), ch-ua-platform-version=(self)'
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};