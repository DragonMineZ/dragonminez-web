import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";
import { sequence } from "astro:middleware";
import type { MiddlewareHandler } from "astro";
import { tooManyRequests } from "./lib/api/response";
import { readLimiter, writeLimiter, likeLimiter } from "./lib/api/cache";

const isProtectedRoute = createRouteMatcher(["/createhair"]);

/**
 * Injects security headers into every response.
 * Placed first in the sequence so headers are present even on Clerk redirects.
 */
const withSecurityHeaders: MiddlewareHandler = async (_context, next) => {
    const response = await next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    return response;
};

/**
 * Per-IP sliding window rate limiter for all /api/* routes.
 *
 * Limits:
 *   GET endpoints      → 60 req/min (readLimiter)
 *   Mutation endpoints → 20 req/min (writeLimiter)
 *   Like toggles       → 30 req/min (likeLimiter)
 *   Webhooks           → bypassed (Clerk signature verification handles security)
 */
const withRateLimit: MiddlewareHandler = async (context, next) => {
    const url = new URL(context.request.url);

    // Only enforce on API routes
    if (!url.pathname.startsWith("/api/")) return next();

    // Webhooks are verified cryptographically — skip rate limit
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

/**
 * Enforces auth redirects for front-end protected pages.
 * API route auth is enforced per-endpoint via withAuth().
 */
const withClerkAuth = clerkMiddleware((auth, context) => {
    const { userId, redirectToSignIn } = auth();
    if (isProtectedRoute(context.request) && !userId) {
        return redirectToSignIn();
    }
});

export const onRequest = sequence(withSecurityHeaders, withRateLimit, withClerkAuth);
