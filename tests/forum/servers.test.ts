import { test } from "node:test";
import assert from "node:assert/strict";
import { serverSchema, rejectSchema } from "../../src/lib/forum/schemas.ts";

const base = { name: "Capsule SMP", address: "play.example.com", version: "1.20.1", language: "en", description: "A friendly survival server with quests." };
const ok = (over: Record<string, unknown>) => serverSchema.safeParse({ ...base, ...over }).success;

test("good server passes, empty invite becomes undefined", () => {
  const r = serverSchema.parse({ ...base, discordInvite: "" });
  assert.equal(r.discordInvite, undefined);
  assert.ok(ok({}));
});

test("addresses: host, host:port and IPv4 pass", () => {
  for (const a of ["play.example.com", "mc.example.com:25565", "localhost", "192.168.0.1:25570", "A-b.example.org"]) assert.ok(ok({ address: a }), a);
});

test("addresses: scheme, path, spaces, odd ports and junk fail", () => {
  for (const a of ["http://x", "http://example.com", "a b", "host/path", "javascript:alert(1)", "ex.com:99999", "ex.com:", "-bad.com", "bad-.com", "a..b", "ex.com:80:80", "ab"]) {
    assert.ok(!ok({ address: a }), a);
  }
});

test("discord invites: only https discord.gg and discord.com/invite", () => {
  for (const i of ["https://discord.gg/abc123", "https://discord.com/invite/dragon-mine_z"]) assert.ok(ok({ discordInvite: i }), i);
  for (const i of ["http://discord.gg/abc", "https://example.com/abc", "javascript:alert(1)", "https://discord.gg/", "https://discord.gg.evil.com/abc", "https://discord.com/other/abc", "discord.gg/abc", "https://discord.gg/abc def"]) {
    assert.ok(!ok({ discordInvite: i }), i);
  }
});

test("length limits and language", () => {
  assert.ok(!ok({ name: "ab" }));
  assert.ok(!ok({ name: "x".repeat(61) }));
  assert.ok(!ok({ version: "" }));
  assert.ok(!ok({ version: "x".repeat(21) }));
  assert.ok(!ok({ description: "too short" }));
  assert.ok(!ok({ description: "x".repeat(2001) }));
  assert.ok(!ok({ language: "fr" }));
  assert.ok(ok({ language: "other" }));
});

test("reject reason is 5-300", () => {
  assert.ok(rejectSchema.safeParse({ reason: "Not a DMZ server" }).success);
  assert.ok(!rejectSchema.safeParse({ reason: "no" }).success);
  assert.ok(!rejectSchema.safeParse({ reason: "x".repeat(301) }).success);
});

test("announcement schema: blank images are dropped, only https links pass", async () => {
  const { announcementSchema } = await import("../../src/lib/forum/schemas.ts");
  const base = { title: "Hello world", body: "text" };
  const ok = announcementSchema.parse({ ...base, subtitle: " ", cover: "https://x.test/a.png", image: "" });
  assert.deepEqual([ok.subtitle, ok.cover, ok.image], [undefined, "https://x.test/a.png", undefined]);
  assert.equal(announcementSchema.safeParse({ ...base, cover: "http://x.test/a.png" }).success, false);
  assert.equal(announcementSchema.safeParse({ ...base, image: "javascript:alert(1)" }).success, false);
});

test("bug and role schemas", async () => {
  const { bugSchema, roleSchema } = await import("../../src/lib/forum/schemas.ts");
  const bug = { title: "Crash on stats menu", version: "2.2.0", env: "1.20.1 / Forge 47", what: "It closes." };
  assert.equal(bugSchema.parse({ ...bug, log: "", steps: " " }).steps, undefined);
  assert.equal(bugSchema.safeParse({ ...bug, log: "http://x.test/log" }).success, false);
  assert.equal(bugSchema.safeParse({ ...bug, version: "" }).success, false);
  assert.equal(roleSchema.safeParse({ name: "Builder", color: "#22c55e" }).success, true);
  assert.equal(roleSchema.safeParse({ name: "Builder", color: "red; background:url(x)" }).success, false);
  assert.equal(roleSchema.safeParse({ name: "B", color: "#22c55e" }).success, false);
});

test("status values per kind, and who can start threads", async () => {
  const { isStatus } = await import("../../src/lib/forum/status.ts");
  const { canStartThread } = await import("../../src/lib/forum/guard.ts");
  assert.equal(isStatus("suggestions", "planned"), true);
  assert.equal(isStatus("suggestions", "fixed"), false);
  assert.equal(isStatus("bugs", "wontfix"), true);
  assert.equal(isStatus("discussion", "open"), false);
  const member = { role: "member" }, mod = { role: "mod" }, admin = { role: "admin" };
  assert.deepEqual([member, mod, admin].map((u) => canStartThread({ postRole: "admin" }, u)), [false, false, true]);
  assert.deepEqual([member, mod, admin].map((u) => canStartThread({ postRole: "staff" }, u)), [false, true, true]);
  assert.deepEqual([member, mod, admin].map((u) => canStartThread({ postRole: "member" }, u)), [true, true, true]);
});
