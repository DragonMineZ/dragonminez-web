import * as VoteRepo from "../repositories/vote.repository";
import * as UserRepo from "../repositories/user.repository";
import { notFound, badRequest } from "../lib/api/response";

export async function getUserVote(clerkId: string): Promise<string | null> {
    const user = await UserRepo.findUserByClerkId(clerkId);
    if (!user) return null;

    const vote = await VoteRepo.findVoteByUserId(user.id_user);
    return vote ? vote.race : null;
}

export async function castVote(clerkId: string, race: string) {
    const user = await UserRepo.findUserByClerkId(clerkId);
    if (!user) return { error: notFound("User not registered locally") };

    const existing = await VoteRepo.findVoteByUserId(user.id_user);
    if (existing) return { error: badRequest("User has already voted") };

    const newVote = await VoteRepo.createVote(user.id_user, race);
    return { data: newVote };
}

export async function getVoteStatistics(): Promise<Record<string, number>> {
    const counts = await VoteRepo.getVoteCounts();
    const stats: Record<string, number> = {
        glind: 0,
        goetian: 0,
        tsufuru: 0,
    };
    counts.forEach((c) => {
        if (c.race in stats) {
            stats[c.race] = c._count.race;
        }
    });
    return stats;
}
