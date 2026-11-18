import { defineMiddleware } from "astro:middleware";
import { prisma } from "./lib/prisma";
import { SESSION_COOKIE, verify } from "./lib/session";
import { forumLocked, mayEnter, openWhenLocked } from "./lib/access";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
  "img-src 'self' data: https:",
  // Vite's hot reload socket, dev server only.
  ...(import.meta.env.DEV ? ["connect-src 'self' ws: wss:"] : []),
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");

function secure(response: Response): Response {
  // While the forum is locked it must not be indexed either.
  if (forumLocked(process.env.FORUM_PUBLIC)) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, cookies, locals } = context;

  // Astro's checkOrigin only covers form content types; writes here are same-origin whatever the body.
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.headers.get("origin") !== url.origin) {
    return secure(new Response("Cross-site requests are forbidden", { status: 403 }));
  }

  locals.user = null;
  const cookie = cookies.get(SESSION_COOKIE)?.value;
  if (cookie) {
    let userId: number | null = null;
    try {
      userId = verify(cookie, process.env.SESSION_SECRET ?? "", Date.now());
    } catch (err) {
      console.error("[auth]", err instanceof Error ? err.message : err);
    }
    const row = userId === null ? null : await prisma.user.findUnique({ where: { id: userId } });
    if (row) {
      locals.user = {
        id: row.id,
        username: row.username,
        avatarUrl: row.avatarUrl,
        role: row.role === "admin" || row.role === "mod" ? row.role : "member",
        banned: row.bannedAt !== null,
      };
    } else {
      cookies.delete(SESSION_COOKIE, { path: "/" });
    }
  }

  // Pre-launch: everything except login, language and the holding page is for staff only (see lib/access.ts).
  if (forumLocked(process.env.FORUM_PUBLIC) && !mayEnter(locals.user) && !openWhenLocked(url.pathname)) {
    return secure(await context.rewrite("/locked"));
  }

  return secure(await next());
});
