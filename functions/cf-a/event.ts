/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const request = context.request;
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
};