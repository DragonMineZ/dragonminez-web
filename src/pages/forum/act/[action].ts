// POST handlers for posts and thread controls. Every form carries `back` (the page it came from).
import type { APIRoute } from "astro";
import { canSeeThread, isStaff, rateLimit, requireUser } from "@/lib/forum/guard.ts";
import { notify } from "@/lib/forum/notify.ts";
import { prisma } from "@/lib/prisma.ts";
import { replySchema, reportSchema } from "@/lib/forum/schemas.ts";
import { postPage } from "@/lib/forum/links.ts";
import { safeNext } from "@/lib/forum/redirect.ts";
import { isStatus } from "@/lib/forum/status.ts";

const EDIT_WINDOW_MS = 30 * 60 * 1000;

const go = (to: string) => new Response(null, { status: 303, headers: { Location: to } });
const forbidden = () => new Response("Forbidden", { status: 403 });

/** `back` with its query replaced by `params`, and an anchor. */
function backTo(back: string, params: Record<string, string | number>, hash = "") {
  const url = new URL(back, "http://x");
  url.search = "";
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  return url.pathname + url.search + hash;
}

export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  const form = await context.request.formData();
  const str = (name: string) => String(form.get(name) ?? "");
  const id = (name: string) => (/^\d{1,9}$/.test(str(name)) ? Number(str(name)) : 0);
  const back = safeNext(str("back"));
  const staff = isStaff(user);
  const page = new URL(back, "http://x").searchParams.get("page");
  const to = (params: Record<string, string | number> = {}, hash = "") => go(backTo(back, { ...(page ? { page } : {}), ...params }, hash));
  const action = context.params.action;

  // Staff actions on a thread.
  if (action === "pin" || action === "lock" || action === "delete-thread") {
    if (!staff) return forbidden();
    const thread = await prisma.thread.findUnique({ where: { id: id("threadId") }, include: { category: true } });
    if (!thread) return new Response("Not found", { status: 404 });
    if (action === "delete-thread") {
      await prisma.thread.delete({ where: { id: thread.id } });
      return go(thread.category.kind === "servers" ? "/forum/servers" : `/forum/c/${thread.category.slug}`);
    }
    const on = str("value") === "1";
    await prisma.thread.update({ where: { id: thread.id }, data: action === "pin" ? { pinned: on } : { locked: on } });
    return to();
  }

  if (action === "status") {
    if (!staff) return forbidden();
    const thread = await prisma.thread.findUnique({ where: { id: id("threadId") }, include: { category: true } });
    if (!thread) return new Response("Not found", { status: 404 });
    if (!isStatus(thread.category.kind, str("value"))) return new Response("Bad request", { status: 400 });
    await prisma.thread.update({ where: { id: thread.id }, data: { status: str("value") } });
    return to();
  }

  if (action === "reply") {
    const thread = await prisma.thread.findUnique({ where: { id: id("threadId") }, include: { server: true } });
    if (!thread || !canSeeThread(thread, user)) return new Response("Not found", { status: 404 });
    if (thread.locked && !staff) return to({ err: "locked" }, "#reply");
    const parsed = replySchema.safeParse({ body: str("body") });
    if (!parsed.success) return to({ err: "body" }, "#reply");
    if (!rateLimit(`reply:${user.id}`, 1, 10_000)) return to({ err: "rate" }, "#reply");
    const [post, count] = await prisma.$transaction(async (tx) => {
      const created = await tx.post.create({ data: { threadId: thread.id, authorId: user.id, body: parsed.data.body } });
      await tx.thread.update({ where: { id: thread.id }, data: { replyCount: { increment: 1 }, lastPostAt: created.createdAt } });
      return [created, await tx.post.count({ where: { threadId: thread.id } })] as const;
    });
    await notify({ userId: thread.authorId, actorId: user.id, type: "reply", threadId: thread.id, postId: post.id });
    return go(backTo(back, { page: postPage(count, !!thread.server) }, `#post-${post.id}`));
  }

  // The rest act on one post.
  const post = await prisma.post.findUnique({ where: { id: id("postId") }, include: { thread: { include: { server: true } } } });
  if (!post || !canSeeThread(post.thread, user)) return new Response("Not found", { status: 404 });
  const anchor = `#post-${post.id}`;
  const keepPage = (params: Record<string, string> = {}) => to(params, anchor);

  if (action === "edit") {
    if (post.authorId !== user.id || post.deletedAt || Date.now() - post.createdAt.getTime() > EDIT_WINDOW_MS) {
      return keepPage({ err: "edit" });
    }
    const parsed = replySchema.safeParse({ body: str("body") });
    if (!parsed.success) return keepPage({ err: "body", edit: String(post.id) });
    await prisma.post.update({ where: { id: post.id }, data: { body: parsed.data.body, editedAt: new Date() } });
    return keepPage();
  }

  if (action === "like") {
    if (post.authorId === user.id || post.deletedAt) return keepPage({ err: "like" });
    if (!rateLimit(`like:${user.id}`, 30, 60_000)) return keepPage({ err: "rate" });
    const removed = await prisma.forumLike.deleteMany({ where: { userId: user.id, postId: post.id } });
    // Likes on the opening post are the thread's votes (suggestions are sorted by them).
    const opening = await prisma.post.findFirst({ where: { threadId: post.threadId }, orderBy: { id: "asc" }, select: { id: true } });
    if (opening?.id === post.id) {
      await prisma.thread.update({ where: { id: post.threadId }, data: { votes: { increment: removed.count === 0 ? 1 : -1 } } });
    }
    if (removed.count === 0) {
      await prisma.forumLike.create({ data: { userId: user.id, postId: post.id } }).catch(() => {});
      const earlier = await prisma.notification.findFirst({
        where: { userId: post.authorId, actorId: user.id, type: "like", postId: post.id },
        select: { id: true },
      });
      if (!earlier) await notify({ userId: post.authorId, actorId: user.id, type: "like", threadId: post.threadId, postId: post.id });
    }
    return keepPage();
  }

  if (action === "report") {
    if (post.authorId === user.id || post.deletedAt) return keepPage({ err: "report" });
    const parsed = reportSchema.safeParse({ reason: str("reason") });
    if (!parsed.success) return keepPage({ err: "reason" });
    if (!rateLimit(`report:${user.id}`, 5, 10 * 60_000)) return keepPage({ err: "rate" });
    const made = await prisma.report
      .create({ data: { reporterId: user.id, postId: post.id, reason: parsed.data.reason } })
      .then(() => true, () => false); // unique (reporter, post): a second report is a no-op
    return keepPage({ msg: made ? "reported" : "already" });
  }

  if (action === "delete-post") {
    if (!staff) return forbidden();
    const first = await prisma.post.findFirst({ where: { threadId: post.threadId }, orderBy: { id: "asc" }, select: { id: true } });
    if (first?.id === post.id) return keepPage({ err: "first" });
    await prisma.post.update({ where: { id: post.id }, data: { deletedAt: post.deletedAt ?? new Date() } });
    return keepPage();
  }

  return new Response("Not found", { status: 404 });
};
