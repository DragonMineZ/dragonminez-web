import * as VoteRepo from "../repositories/vote.repository";
import * as UserRepo from "../repositories/user.repository";
import { notFound, badRequest } from "../lib/api/response";

export const VOTE_START_TIME = new Date("2026-07-17T11:00:00-05:00").getTime();
export const VOTE_END_TIME = new Date("2026-07-17T11:47:00-05:00").getTime();


export async function getUserVote(clerkId: string): Promise<string | null> {
    const user = await UserRepo.findUserByClerkId(clerkId);
    if (!user) return null;

    const vote = await VoteRepo.findVoteByUserId(user.id_user);
    return vote ? vote.race : null;
}

export async function castVote(clerkId: string, race: string) {
    const now = Date.now();
    if (now < VOTE_START_TIME) return { error: badRequest("Voting has not started yet") };
    if (now > VOTE_END_TIME) return { error: badRequest("Voting has already ended") };

    const user = await UserRepo.findUserByClerkId(clerkId);
    if (!user) return { error: notFound("User not registered locally") };

    const existing = await VoteRepo.findVoteByUserId(user.id_user);
    if (existing) return { error: badRequest("User has already voted") };

    const newVote = await VoteRepo.createVote(user.id_user, race);
    return { data: newVote };
}

export async function getVoteStatistics(): Promise<{ status: string, winner: string | null, results: Record<string, number> }> {
    const counts = await VoteRepo.getVoteCounts();
    const stats: Record<string, number> = {
        glind: 0,
        goetian: 0,
        tsufuru: 0,
    };

    let maxVotes = -1;
    let winner: string | null = null;

    counts.forEach((c) => {
        if (c.race in stats) {
            stats[c.race] = c._count.race;
            if (c._count.race > maxVotes) {
                maxVotes = c._count.race;
                winner = c.race;
            }
        }
    });

    const now = Date.now();
    let status = 'active';
    if (now < VOTE_START_TIME) status = 'upcoming';
    if (now > VOTE_END_TIME) status = 'ended';

    return {
        status,
        winner: status === 'ended' ? winner : null,
        results: stats
    };
}
