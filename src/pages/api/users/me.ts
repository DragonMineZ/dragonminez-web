import { ok, notFound, serverError } from "../../../lib/api/response";
import { withAuth } from "../../../lib/api/guards";
import { getUserProfile } from "../../../services/user.service";

/**
 * GET /api/users/me
 * Returns the authenticated user's profile (excludes clerk_id).
 */
export const GET = withAuth(async (_context, userId) => {
    try {
        const user = await getUserProfile(userId);
        if (!user) return notFound("User not found");
        return ok(user);
    } catch {
        return serverError("Failed to fetch user");
    }
});
