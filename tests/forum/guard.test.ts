import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../../src/lib/forum/redirect.ts";
import { roleOf } from "../../src/lib/forum/access.ts";
import { levelOf } from "../../src/lib/discord/moderation.ts";
import { rateLimit, isStaff } from "../../src/lib/forum/guard.ts";

test("safeNext keeps same-site paths only", () => {
  assert.equal(safeNext("/forum/t/5?page=2"), "/forum/t/5?page=2");
  assert.equal(safeNext("/forum"), "/forum");
  for (const bad of [null, undefined, "", "//evil.example", "https://evil.example", "/\\evil.example", "\\\\evil.example", "t/5", "/\t/evil.example", "/\n/evil.example", "javascript:alert(1)", "/" + "a".repeat(600)]) {
    assert.equal(safeNext(bad), "/forum", String(bad));
  }
  assert.equal(safeNext("//evil.example", "/x"), "/x");
});

test("roleOf: Discord admins are admins, staff roles are mods, the break-glass list adds admins", () => {
  assert.equal(roleOf("5", "admin"), "admin");
  assert.equal(roleOf("5", "mod"), "mod");
  assert.equal(roleOf("5", null), "member");
  assert.equal(roleOf(null, null, "900"), "member");
  assert.equal(roleOf("900", null, "100, 900"), "admin", "break-glass admin");
  assert.equal(roleOf("900", "mod", "900"), "admin");
});

test("levelOf: owner and Administrator permission are admin, DISCORD_MODERATOR_ROLES are mod", () => {
  const guild = {
    ownerId: "100",
    roles: new Map([
      ["1", { name: "@everyone", permissions: 0n }],
      ["2", { name: "moderator", permissions: 0n }],
      ["3", { name: "boss", permissions: 8n }],
      ["4", { name: "helper", permissions: 1n << 13n }],
    ]),
  };
  assert.equal(levelOf("100", [], guild, ["moderator"]), "admin", "server owner");
  assert.equal(levelOf("5", ["1", "3"], guild, ["moderator"]), "admin", "Administrator permission");
  assert.equal(levelOf("5", ["2", "3"], guild, ["moderator"]), "admin", "admin wins over a staff role");
  assert.equal(levelOf("5", ["2"], guild, ["moderator"]), "mod", "role name");
  assert.equal(levelOf("5", ["4"], guild, ["4"]), "mod", "role id");
  assert.equal(levelOf("5", ["1", "4"], guild, ["moderator"]), null, "plain member");
  assert.equal(levelOf("5", ["999"], guild, ["moderator"]), null, "unknown role id");
});

test("rateLimit is a sliding window per key", () => {
  assert.equal(rateLimit("t:a", 2, 1000, 0), true);
  assert.equal(rateLimit("t:a", 2, 1000, 500), true);
  assert.equal(rateLimit("t:a", 2, 1000, 900), false);
  assert.equal(rateLimit("t:b", 2, 1000, 900), true, "other key");
  assert.equal(rateLimit("t:a", 2, 1000, 1001), true, "first hit left the window");
  assert.equal(rateLimit("t:a", 2, 1000, 1400), false);
});

test("isStaff", () => {
  assert.equal(isStaff({ role: "mod" }), true);
  assert.equal(isStaff({ role: "admin" }), true);
  assert.equal(isStaff({ role: "member" }), false);
  assert.equal(isStaff(null), false);
});
