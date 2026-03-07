import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/prisma";

export const POST: APIRoute = async ({ params, locals }) => {
    const { userId: clerkId } = locals.auth();

    if (!clerkId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { id } = params;
    if (!id) return new Response(null, { status: 400 });

    try {
        const hairId = parseInt(id);

        // Buscar el usuario local por su clerk_id
        const user = await prisma.user.findUnique({
            where: { clerk_id: clerkId }
        });

        if (!user) {
            return new Response(JSON.stringify({ error: "Usuario no registrado localmente" }), { status: 404 });
        }

        const userId = user.id_user;

        // Verificar si ya existe el like para toggle
        const existingLike = await prisma.like.findUnique({
            where: {
                id_user_id_hair: {
                    id_user: userId,
                    id_hair: hairId
                }
            }
        });

        if (existingLike) {
            // Quitar like
            await prisma.like.delete({
                where: {
                    id_user_id_hair: {
                        id_user: userId,
                        id_hair: hairId
                    }
                }
            });

            return new Response(JSON.stringify({ liked: false }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } else {
            // Dar like
            await prisma.like.create({
                data: {
                    id_user: userId,
                    id_hair: hairId
                }
            });

            return new Response(JSON.stringify({ liked: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        return new Response(JSON.stringify({ error: "Error al procesar el like" }), {
            status: 500
        });
    }
};

export const GET: APIRoute = async ({ params, locals }) => {
    const { userId: clerkId } = locals.auth();
    const { id } = params;
    if (!id) return new Response(null, { status: 400 });

    try {
        const hairId = parseInt(id);

        if (!clerkId) {
            return new Response(JSON.stringify({ liked: false }), { status: 200 });
        }

        const user = await prisma.user.findUnique({
            where: { clerk_id: clerkId }
        });

        if (!user) {
            return new Response(JSON.stringify({ liked: false }), { status: 200 });
        }

        const like = await prisma.like.findUnique({
            where: {
                id_user_id_hair: {
                    id_user: user.id_user,
                    id_hair: hairId
                }
            }
        });

        return new Response(JSON.stringify({ liked: !!like }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Error al obtener estado del like" }), {
            status: 500
        });
    }
};
