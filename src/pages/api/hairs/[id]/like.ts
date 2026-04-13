import { ok, badRequest, serverError } from "../../../../lib/api/response";
import { withAuth } from "../../../../lib/api/guards";
import { parseId } from "../../../../lib/api/params";
import { handlePrismaError } from "../../../../lib/api/errors";
import { giveLike, removeLike } from "../../../../services/like.service";

// ── Handlers: PUT
export const PUT = withAuth(async ({ params }, userId) => {
    const hairId = parseId(params.id);
    if (!hairId) return badRequest("Hair id must be a positive integer");

    try {
        const result = await giveLike(userId, hairId);
        if ("error" in result) return result.error;
        return ok(result.data);
    } catch (err) {
        return handlePrismaError(err);
    }
});

// ── Handlers: DELETE
export const DELETE = withAuth(async ({ params }, userId) => {
    const hairId = parseId(params.id);
    if (!hairId) return badRequest("Hair id must be a positive integer");

    try {
        const result = await removeLike(userId, hairId);
        if ("error" in result) return result.error;
        return ok(result.data);
    } catch (err) {
        return handlePrismaError(err);
    }
});

