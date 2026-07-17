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
        `img-src 'self' https://img.clerk.com https://images.clerk.dev https://media.discordapp.net https://cdn.discord.app https://flagcdn.com https://i.imgur.com`,
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

    if (!url.pathname.startsWith("/api/") && url.pathname !== "/vote") return next();

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
        if (url.pathname === "/vote") {
            return new Response(
                `<!DOCTYPE html>
                <html lang="es">
                    <head>
                        <title>Límite de peticiones - DragonMineZ</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { 
                                background-color: #0f0f11; 
                                color: #ffffff; 
                                font-family: system-ui, -apple-system, sans-serif; 
                                display: flex; 
                                align-items: center; 
                                justify-content: center; 
                                height: 100vh; 
                                margin: 0; 
                                text-align: center; 
                                padding: 1rem;
                                box-sizing: border-box;
                            }
                            .card { 
                                padding: 3rem 2rem; 
                                border-radius: 2rem; 
                                background: rgba(28, 28, 31, 0.85); 
                                border: 1px solid rgba(255, 255, 255, 0.08); 
                                backdrop-filter: blur(16px);
                                max-w: 480px; 
                                width: 100%;
                                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                            }
                            h1 { 
                                color: #f97316; 
                                font-size: 2.25rem;
                                font-weight: 900;
                                text-transform: uppercase;
                                font-style: italic;
                                letter-spacing: -0.05em;
                                margin-top: 0; 
                                margin-bottom: 1rem;
                            }
                            p { 
                                color: rgba(255, 255, 255, 0.7); 
                                line-height: 1.6; 
                                font-size: 1.1rem;
                                margin-bottom: 2rem;
                            }
                            .btn {
                                display: inline-block;
                                background: #ffffff;
                                color: #000000;
                                font-weight: 700;
                                text-decoration: none;
                                padding: 0.85rem 2rem;
                                border-radius: 9999px;
                                transition: all 0.3s ease;
                            }
                            .btn:hover {
                                opacity: 0.9;
                                transform: scale(1.02);
                            }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Demasiadas Peticiones</h1>
                            <p>¡Tranquilo, guerrero! Has superado el límite de intentos. Por favor, espera <strong>${retryAfter}</strong> segundos antes de volver a cargar la página de votación.</p>
                            <a href="/vote" class="btn">Volver a Intentar</a>
                        </div>
                    </body>
                </html>`,
                {
                    status: 429,
                    headers: {
                        "Content-Type": "text/html; charset=utf-8",
                        "Retry-After": String(retryAfter)
                    }
                }
            );
        }

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
