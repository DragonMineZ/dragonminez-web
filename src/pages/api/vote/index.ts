import type { APIRoute } from "astro";
import { ok, badRequest } from "../../../lib/api/response";
import { withAuth } from "../../../lib/api/guards";
import { handlePrismaError } from "../../../lib/api/errors";
import * as VoteService from "../../../services/vote.service";

export const GET: APIRoute = async ({ request, locals }) => {
    const { userId } = locals.auth();
    const url = new URL(request.url);
    const excludeUserVote = url.searchParams.get("excludeUserVote") === "true";

    try {
        const stats = await VoteService.getVoteStatistics();
        let votedRace: string | null = null;
        if (userId && !excludeUserVote) {
            votedRace = await VoteService.getUserVote(userId);
        }

        return ok({
            ...stats,
            votedRace,
        });
    } catch (err) {
        return handlePrismaError(err);
    }
};

export const POST = withAuth(async ({ request }, userId) => {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return badRequest("errors.api.badRequest");
    }

    if (!body || typeof body !== "object" || !("race" in body)) {
        return badRequest("race is required");
    }

    const { race } = body as { race: string };
    if (!["glind", "goetian", "tsufuru"].includes(race)) {
        return badRequest("Invalid race selection");
    }

    try {
        const result = await VoteService.castVote(userId, race);
        if ("error" in result) {
            return result.error;
        }
        return ok({ success: true, votedRace: race });
    } catch (err) {
        return handlePrismaError(err);
    }
});
