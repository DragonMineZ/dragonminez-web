import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma";

export const GET: APIRoute = async ({ params }) => {
    const { id } = params;
    if (!id) return new Response(null, { status: 400 });

    try {
        const hair = await prisma.hair.findUnique({
            where: { id_hair: parseInt(id) },
            include: {
                categories: true,
                artist: true,
            },
        });

        if (!hair) {
            return new Response(JSON.stringify({ error: "Hair no encontrado" }), {
                status: 404,
            });
        }

        return new Response(JSON.stringify(hair), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Error al obtener el hair" }), {
            status: 500,
        });
    }
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
    const { isAuthenticated } = locals.auth()

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const { id } = params;
    if (!id) return new Response(null, { status: 400 });

    try {
        const body = await request.json();
        const { name, code, image_url, description, categoryIds } = body;

        const updatedHair = await prisma.hair.update({
            where: { id_hair: parseInt(id) },
            data: {
                name,
                code,
                image_url,
                description,
                categories: categoryIds
                    ? {
                        set: categoryIds.map((id: number) => ({ id_category: id })),
                    }
                    : undefined,
            },
            include: {
                categories: true,
            },
        });

        return new Response(JSON.stringify(updatedHair), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Error al actualizar el hair" }),
            { status: 500 }
        );
    }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
    const { isAuthenticated } = locals.auth()

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const { id } = params;
    if (!id) return new Response(null, { status: 400 });

    try {
        await prisma.hair.delete({
            where: { id_hair: parseInt(id) },
        });
        return new Response(
            JSON.stringify({ message: "Hair eliminado correctamente" }),
            { status: 200 }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Error al eliminar el hair" }),
            { status: 500 }
        );
    }
};
