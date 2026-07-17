import { prisma } from "../lib/prisma";

export async function findVoteByUserId(userId: number) {
    return prisma.vote.findUnique({
        where: { id_user: userId },
    });
}

export async function createVote(userId: number, race: string) {
    return prisma.vote.create({
        data: { id_user: userId, race },
    });
}

export async function getVoteCounts() {
    return prisma.vote.groupBy({
        by: ["race"],
        _count: {
            race: true,
        },
    });
}
