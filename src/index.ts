import { Env, RequestContext } from './types';
import { handleRequest } from './router';
import { trackEvent } from './services/analytics';
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
    const startTime = performance.now();

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

    ctx.waitUntil(
      (async () => {
        const duration = Math.round(performance.now() - startTime);
        await trackEvent(requestContext, response.status, duration);
      })()
    );

    return response;
  },
};