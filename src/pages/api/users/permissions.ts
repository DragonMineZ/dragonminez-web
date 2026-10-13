import { ok } from "../../../lib/api/response";
import { withAuth } from "../../../lib/api/guards";
import { canModerate } from "../../../lib/discord/moderation";

export const GET = withAuth(async ({ locals }) => {
    return ok({ canModerate: await canModerate(locals) });
});
