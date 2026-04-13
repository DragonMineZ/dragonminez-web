import { prisma } from "../lib/prisma";

export async function findLike(userId: number, hairId: number) {
    return prisma.like.findUnique({
        where: { id_user_id_hair: { id_user: userId, id_hair: hairId } },
    });
}

export async function createLike(userId: number, hairId: number) {
    return prisma.like.create({
        data: { id_user: userId, id_hair: hairId },
    });
}

export async function deleteLike(userId: number, hairId: number) {
    return prisma.like.delete({
        where: { id_user_id_hair: { id_user: userId, id_hair: hairId } },
    });
}
