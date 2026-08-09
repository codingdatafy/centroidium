/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/cf-a/event" && request.method === "POST") {
      try {
        const body = await request.text();
        const response = await fetch("https://cloudflareinsights.com/cdn-cgi/rum", {
          method: "POST",
          headers: {
            "content-type": request.headers.get("content-type") || "text/plain;charset=UTF-8",
            "user-agent": request.headers.get("user-agent") || "",
          },
          body: body,
        });

        return new Response(response.body, {
          status: response.status,
          headers: {
            "access-control-allow-origin": "*",
          },
        });
      } catch {
        return new Response("OK", { status: 200 });
      }
    }

    return env.ASSETS.fetch(request);
  },
};