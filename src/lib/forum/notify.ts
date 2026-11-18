import { prisma } from "../prisma.ts";

type NotifyInput = {
  userId: number;
  actorId: number;
  type: "reply" | "like" | "server_approved" | "server_rejected";
  threadId?: number;
  postId?: number;
  serverId?: number;
};

export async function notify({ userId, actorId, type, threadId, postId, serverId }: NotifyInput) {
  if (userId === actorId) return;
  try {
    await prisma.notification.create({ data: { userId, actorId, type, threadId, postId, serverId } });
  } catch (err) {
    console.error("notify failed", err);
  }
}
