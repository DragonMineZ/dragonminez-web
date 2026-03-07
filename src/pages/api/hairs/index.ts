import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma";

export const GET: APIRoute = async () => {
    try {
        const hairs = await prisma.hair.findMany({
            include: {
                categories: true,
                artist: true,
                _count: {
                    select: { likes: true }
                }
            },
        });
        return new Response(JSON.stringify(hairs), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Error al obtener hairs" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

export const POST: APIRoute = async ({ request, locals }) => {
    const { isAuthenticated } = locals.auth()

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    try {
        const body = await request.json();
        const { name, code, image_url, description, artistId, categoryIds } = body;

        if (!name || !code || !image_url || !artistId) {
            return new Response(
                JSON.stringify({ error: "Faltan campos obligatorios" }),
                { status: 400 }
            );
        }

        const newHair = await prisma.hair.create({
            data: {
                name,
                code,
                image_url,
                description,
                artist: { connect: { id_user: artistId } },
                categories: categoryIds
                    ? {
                        connect: categoryIds.map((id: number) => ({ id_category: id })),
                    }
                    : undefined,
            },
            include: {
                categories: true,
                _count: {
                    select: { likes: true }
                }
            },
        });

        return new Response(JSON.stringify(newHair), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Error al crear el hair" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
