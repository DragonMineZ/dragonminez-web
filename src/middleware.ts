import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";
import { sequence } from "astro:middleware";
import type { MiddlewareHandler } from "astro";
import { tooManyRequests } from "./lib/api/response";
import { readLimiter, writeLimiter, likeLimiter } from "./lib/api/cache";

const isProtectedRoute = createRouteMatcher(["/createhair"]);

// ── Security
const withSecurityHeaders: MiddlewareHandler = async (_context, next) => {
    const response = await next();
    
    // Clerk Production Domains
    const clerkApiUrl = "https://clerk.dragonminez.com";
    const clerkAccountsUrl = "https://accounts.dragonminez.com";

    const cspDirectives = [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkApiUrl} ${clerkAccountsUrl} https://challenges.cloudflare.com https://static.cloudflareinsights.com`,
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com`,
        `font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com`,
        `img-src 'self' https://img.clerk.com https://images.clerk.dev https://flagcdn.com https://i.imgur.com https://imgur.com data:`,
        `frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com`,
        `connect-src 'self' ${clerkApiUrl} ${clerkAccountsUrl}`,
        "worker-src 'self' blob:",
        "form-action 'self'",
    ].join("; ");

    response.headers.set("Content-Security-Policy", cspDirectives);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    return response;
};

// ── Rate Limit
const withRateLimit: MiddlewareHandler = async (context, next) => {
    const url = new URL(context.request.url);

    if (!url.pathname.startsWith("/api/")) return next();

    if (url.pathname.startsWith("/api/webhooks/")) return next();

    const ip =
        context.request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        context.request.headers.get("x-real-ip") ||
        "unknown";

    const method = context.request.method.toUpperCase();
    const isLikeRoute = url.pathname.endsWith("/like");

    let allowed: boolean;
    let retryAfter: number;

    if (isLikeRoute && (method === "PUT" || method === "DELETE")) {
        allowed = likeLimiter.check(ip);
        retryAfter = likeLimiter.retryAfter(ip);
    } else if (["POST", "PATCH", "DELETE"].includes(method)) {
        const key = `${ip}:write`;
        allowed = writeLimiter.check(key);
        retryAfter = writeLimiter.retryAfter(key);
    } else {
        allowed = readLimiter.check(ip);
        retryAfter = readLimiter.retryAfter(ip);
    }

    if (!allowed) {
        const response = tooManyRequests(
            `Rate limit exceeded. Please wait ${retryAfter}s before retrying.`
        );
        response.headers.set("Retry-After", String(retryAfter));
        return response;
    }

    return next();
};

// ── Clerk Auth
const clerk = clerkMiddleware((auth, context) => {
    const { userId, redirectToSignIn } = auth();
    if (isProtectedRoute(context.request) && !userId) {
        return redirectToSignIn();
    }
});

const withClerkAuth: MiddlewareHandler = (context, next) => {
    // Saltarse Clerk Auth para webhooks (se validan internamente con su firma)
    if (context.url.pathname.startsWith("/api/webhooks/")) {
        return next();
    }
    return clerk(context, next);
};

export const onRequest = sequence(withSecurityHeaders, withRateLimit, withClerkAuth);
