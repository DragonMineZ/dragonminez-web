function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            ...headers
        },
    });
}

export const ok = (data: unknown, headers?: Record<string, string>) => json(data, 200, headers);

export const created = (data: unknown) => json(data, 201);
export const badRequest = (message = "Bad Request") => json({ error: message }, 400);
export const unauthorized = (message = "Unauthorized") => json({ error: message }, 401);
export const forbidden = (message = "Forbidden") => json({ error: message }, 403);
export const notFound = (message = "Not Found") => json({ error: message }, 404);
export const conflict = (message = "Conflict") => json({ error: message }, 409);
export const unprocessableEntity = (message = "Unprocessable Entity") => json({ error: message }, 422);
export const tooManyRequests = (message = "Too Many Requests") => json({ error: message }, 429);
export const serverError = (message = "Internal Server Error") => json({ error: message }, 500);
export const noContent = () => new Response(null, { status: 204 });
