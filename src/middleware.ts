import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";
import { sequence } from "astro:middleware";
import type { MiddlewareHandler } from "astro";
import { tooManyRequests } from "./lib/api/response";
import { readLimiter, writeLimiter, likeLimiter } from "./lib/api/cache";

const isProtectedRoute = createRouteMatcher(["/createhair"]);

// ── Security
const withSecurityHeaders: MiddlewareHandler = async (_context, next) => {
    const response = await next();
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
const withClerkAuth = clerkMiddleware((auth, context) => {
    const { userId, redirectToSignIn } = auth();
    if (isProtectedRoute(context.request) && !userId) {
        return redirectToSignIn();
    }
});

export const onRequest = sequence(withSecurityHeaders, withRateLimit, withClerkAuth);
