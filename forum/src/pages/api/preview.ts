import type { APIRoute } from "astro";
import { rateLimit, requireUser } from "../../lib/guard";
import { renderMarkdown } from "../../lib/text";

export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  if (!rateLimit(`preview:${user.id}`, 30, 60_000)) return new Response("Too many requests", { status: 429 });
  const text = await context.request.text();
  if (text.length > 5000) return new Response("Too long", { status: 413 });
  return new Response(renderMarkdown(text), { headers: { "Content-Type": "text/html; charset=utf-8" } });
};
