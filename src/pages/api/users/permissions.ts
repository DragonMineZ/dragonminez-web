import { withAuth } from "../../../lib/api/guards";
import { ok } from "../../../lib/api/response";
import { getUserPermissions } from "../../../services/permission.service";

export const prerender = false;

/** GET /api/users/permissions — Discord-role based permissions of the signed-in user. */
export const GET = withAuth(async (context, userId) => {
    const permissions = await getUserPermissions(context, userId);
    return ok(permissions);
});
