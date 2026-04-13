import type { APIRoute } from "astro";
import { ok, badRequest, serverError } from "../../../lib/api/response";
import { verifyWebhook } from "@clerk/astro/webhooks";
import { syncFromClerk } from "../../../services/user.service";

export const POST: APIRoute = async ({ request }) => {
    let evt: Awaited<ReturnType<typeof verifyWebhook>>;
    try {
        evt = await verifyWebhook(request, {
            signingSecret: import.meta.env.CLERK_WEBHOOK_SIGNING_SECRET,
        });
    } catch {
        return badRequest("Webhook signature verification failed");
    }

    try {
        const result = await syncFromClerk(
            evt.type,
            evt.data as Parameters<typeof syncFromClerk>[1]
        );
        return ok(result);
    } catch (err) {
        console.error("[Webhook] Processing error:", err);
        return serverError("Failed to process webhook event");
    }
};

