import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma";
import { verifyWebhook } from "@clerk/astro/webhooks";

export const POST: APIRoute = async ({ request }) => {
    try {
        const evt = await verifyWebhook(request, {
            signingSecret: import.meta.env.CLERK_WEBHOOK_SIGNING_SECRET,
        });

        const { type, data } = evt;

        if (type === "user.created" || type === "user.updated") {
            const clerkId = data.id;
            const email = data.email_addresses?.[0]?.email_address;
            const username = data.username || data.first_name || `user_${clerkId.slice(0, 8)}`;
            const avatarUrl = data.image_url || "";

            await prisma.user.upsert({
                where: { clerk_id: clerkId },
                update: {
                    username,
                    email,
                    avatar_url: avatarUrl,
                },
                create: {
                    clerk_id: clerkId,
                    username,
                    email,
                    avatar_url: avatarUrl,
                },
            });

            console.log(`User ${type}: ${clerkId} - ${username}`);
            return new Response(JSON.stringify({ message: "User synced" }), { status: 200 });
        }

        if (type === "user.deleted") {
            const clerkId = data.id;

            await prisma.user.delete({
                where: { clerk_id: clerkId },
            }).catch(() => {});

            console.log(`User deleted: ${clerkId}`);
            return new Response(JSON.stringify({ message: "User deleted" }), { status: 200 });
        }

        return new Response(JSON.stringify({ message: "Event ignored" }), { status: 200 });
    } catch (err) {
        console.error("Webhook error:", err);
        return new Response(JSON.stringify({ error: "Webhook verification failed" }), { status: 400 });
    }
};
