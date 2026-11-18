// Staff POST handlers: approve, reject, report-resolve, report-dismiss, report-delete-post, report-delete-thread, ban, unban.
// Every form carries `back`. Claims are first-wins: `updateMany` on the old status, and only a count of 1 acts.
import type { APIRoute } from "astro";
import { isAdmin, isStaff, rateLimit, requireUser } from "@/lib/forum/guard.ts";
import { notify } from "@/lib/forum/notify.ts";
import { prisma } from "@/lib/prisma.ts";
import { rejectSchema, roleSchema } from "@/lib/forum/schemas.ts";
import { safeNext } from "@/lib/forum/redirect.ts";

const go = (to: string) => new Response(null, { status: 303, headers: { Location: to } });

export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  if (!isStaff(user)) return new Response("Forbidden", { status: 403 });

  const form = await context.request.formData();
  const str = (name: string) => String(form.get(name) ?? "");
  const id = (name: string) => (/^\d{1,9}$/.test(str(name)) ? Number(str(name)) : 0);
  const back = new URL(safeNext(str("back")), "http://x").pathname;
  const to = (params: Record<string, string> = {}) => go(back + (Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""));
  const action = context.params.action;

  // Community roles (name + color, like Discord): admins only.
  if (action?.startsWith("role-")) {
    if (!isAdmin(user)) return new Response("Forbidden", { status: 403 });
    if (!rateLimit(`role:${user.id}`, 30, 60_000)) return to({ err: "rate" });
    const roleId = id("roleId");
    if (action === "role-create" || action === "role-update") {
      const parsed = roleSchema.safeParse({ name: str("name"), color: str("color") });
      if (!parsed.success) return to({ err: parsed.error.issues[0].path[0] === "color" ? "color" : "name" });
      if (action === "role-create" && (await prisma.communityRole.count()) >= 25) return to({ err: "count" });
      const clash = await prisma.communityRole.findFirst({
        where: { name: { equals: parsed.data.name, mode: "insensitive" }, ...(action === "role-update" && { id: { not: roleId } }) },
      });
      if (clash) return to({ err: "dupe" });
      if (action === "role-create") {
        await prisma.communityRole.create({ data: parsed.data });
        return to({ msg: "created" });
      }
      const updated = await prisma.communityRole.updateMany({ where: { id: roleId }, data: parsed.data });
      return to(updated.count ? { msg: "saved" } : { err: "notfound" });
    }
    if (action === "role-delete") {
      await prisma.communityRole.deleteMany({ where: { id: roleId } });
      return to({ msg: "deleted" });
    }
    if (action === "role-give") {
      const role = await prisma.communityRole.findUnique({ where: { id: roleId } });
      if (!role) return to({ err: "notfound" });
      const member = await prisma.forumUser.findFirst({ where: { username: { equals: str("username").trim(), mode: "insensitive" } } });
      if (!member) return to({ err: "user" });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: member.id, roleId } },
        update: {},
        create: { userId: member.id, roleId },
      });
      return to({ msg: "given" });
    }
    if (action === "role-remove") {
      await prisma.userRole.deleteMany({ where: { userId: id("userId"), roleId } });
      return to({ msg: "removed" });
    }
    return new Response("Not found", { status: 404 });
  }

  if (action === "approve" || action === "reject") {
    const server = await prisma.server.findUnique({ where: { id: id("serverId") } });
    if (!server) return new Response("Not found", { status: 404 });
    let data: { status: string; rejectReason?: string } = { status: "approved" };
    if (action === "reject") {
      const parsed = rejectSchema.safeParse({ reason: str("reason") });
      if (!parsed.success) return to({ err: "reason" });
      data = { status: "rejected", rejectReason: parsed.data.reason };
    }
    const claimed = await prisma.server.updateMany({ where: { id: server.id, status: "pending" }, data });
    if (claimed.count === 1) {
      await notify({
        userId: server.ownerId,
        actorId: user.id,
        type: action === "approve" ? "server_approved" : "server_rejected",
        threadId: server.threadId,
        serverId: server.id,
      });
    }
    return to();
  }

  if (action === "report-resolve" || action === "report-dismiss" || action === "report-delete-post" || action === "report-delete-thread") {
    const report = await prisma.report.findUnique({ where: { id: id("reportId") }, include: { post: true } });
    if (!report) return new Response("Not found", { status: 404 });
    const deleting = action === "report-delete-post" || action === "report-delete-thread";
    if (action === "report-delete-post") {
      const first = await prisma.post.findFirst({ where: { threadId: report.post.threadId }, orderBy: { id: "asc" }, select: { id: true } });
      if (first?.id === report.postId) return to({ err: "first" });
    }
    const claimed = await prisma.report.updateMany({
      where: { id: report.id, status: "open" },
      data: { status: action === "report-dismiss" ? "dismissed" : "resolved", handledById: user.id },
    });
    if (claimed.count === 1 && deleting) {
      if (action === "report-delete-thread") {
        await prisma.thread.delete({ where: { id: report.post.threadId } });
      } else {
        await prisma.post.update({ where: { id: report.postId }, data: { deletedAt: report.post.deletedAt ?? new Date() } });
        await prisma.report.updateMany({ where: { postId: report.postId, status: "open" }, data: { status: "resolved", handledById: user.id } });
      }
    }
    return to();
  }

  if (action === "ban" || action === "unban") {
    const target = await prisma.forumUser.findUnique({ where: { id: id("userId") } });
    if (!target) return to({ err: "user" });
    if (action === "ban") {
      if (target.id === user.id) return to({ err: "self" });
      if (target.role === "admin" || (target.role === "mod" && user.role !== "admin")) return to({ err: "role" });
    }
    await prisma.forumUser.update({ where: { id: target.id }, data: { bannedAt: action === "ban" ? (target.bannedAt ?? new Date()) : null } });
    return to({ msg: action === "ban" ? "banned" : "unbanned" });
  }

  return new Response("Not found", { status: 404 });
};
