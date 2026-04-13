import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma";

export const GET: APIRoute = async ({ locals }) => {
    const { userId } = locals.auth();
    let dbUserId: number | null = null;
    
    if (userId) {
        const dbUser = await prisma.user.findUnique({ where: { clerk_id: userId }, select: { id_user: true } });
        dbUserId = dbUser?.id_user || null;
    }

    try {
        const rawHairs = await prisma.hair.findMany({
            include: {
                categories: true,
                artist: true,
                likes: dbUserId ? { where: { id_user: dbUserId } } : false,
                _count: {
                    select: { likes: true }
                }
            },
        });

        const hairs = rawHairs.map(h => {
            const { likes, ...rest } = h as any;
            return {
                ...rest,
                is_liked_by_user: likes ? likes.length > 0 : false
            };
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
    const { userId } = locals.auth()

    if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    try {
        const body = await request.json();
        const { name, code, image_url, description, categoryIds } = body;

        if (!name || !code || !image_url) {
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
                artist: { connect: { clerk_id: userId } },
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
