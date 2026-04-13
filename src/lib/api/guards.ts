import type { APIContext, APIRoute } from "astro";
import { unauthorized } from "./response";

type AuthenticatedHandler = (
    context: APIContext,
    userId: string
) => Response | Promise<Response>;

export function withAuth(handler: AuthenticatedHandler): APIRoute {

    return (context: APIContext) => {
        const { userId } = context.locals.auth();
        if (!userId) return unauthorized();
        return handler(context, userId);
    };
}
