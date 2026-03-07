import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma";

export const GET: APIRoute = async () => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                id_category: 'asc'
            }
        });
        return new Response(JSON.stringify(categories), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Error al obtener categorías" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
