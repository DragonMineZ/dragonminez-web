import type { APIRoute } from "astro";
import { ok, badRequest, notFound, serverError, noContent } from "../../../lib/api/response";
import { withAuth } from "../../../lib/api/guards";
import { parseId } from "../../../lib/api/params";
import { validateBody, updateHairSchema } from "../../../lib/api/schemas";
import { handlePrismaError } from "../../../lib/api/errors";
import { hairsCache } from "../../../lib/api/cache";
import * as HairService from "../../../services/hair.service";
import { getUserPermissions } from "../../../services/permission.service";

const PUBLIC_CACHE = {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
};

// ── Handlers
export const GET: APIRoute = async ({ params }) => {
    const hairId = parseId(params.id);
    if (!hairId) return badRequest("Hair id must be a positive integer");

    try {
        const hair = await HairService.getHairById(hairId);
        if (!hair) return notFound("Hair not found");
        return ok(hair, PUBLIC_CACHE);
    } catch (err) {

        return handlePrismaError(err);
    }
};

export const PATCH = withAuth(async ({ params, request }, userId) => {
    const hairId = parseId(params.id);
    if (!hairId) return badRequest("Hair id must be a positive integer");

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return badRequest("Could not parse request body as JSON");
    }

    const validation = validateBody(updateHairSchema, body);
    if (!validation.success) return validation.error;

    try {
        const result = await HairService.updateHair(hairId, userId, validation.data);
        if ("error" in result) return result.error;
        hairsCache.clear();
        return ok(result.data);
    } catch (err) {
        return handlePrismaError(err);
    }
});

export const DELETE = withAuth(async (context, userId) => {
    const hairId = parseId(context.params.id);
    if (!hairId) return badRequest("Hair id must be a positive integer");

    const { canModerateSalon } = await getUserPermissions(context, userId);

    try {
        const result = await HairService.removeHair(hairId, userId, canModerateSalon);
        if ("error" in result) return result.error;
        hairsCache.clear();
        return noContent();
    } catch (err) {
        return handlePrismaError(err);
    }
});

