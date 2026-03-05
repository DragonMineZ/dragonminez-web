import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma";

export const GET: APIRoute = async ({ locals }) => {
    const { isAuthenticated, userId } = locals.auth();

    if (!isAuthenticated || !userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { clerk_id: userId },
        });

        if (!user) {
            return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
        }

        return new Response(JSON.stringify(user), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Error fetching user" }), { status: 500 });
    }
};
