import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../../src/lib/forum/redirect.ts";
import { roleOf } from "../../src/lib/forum/access.ts";
import { rateLimit, isStaff } from "../../src/lib/forum/guard.ts";

test("safeNext keeps same-site paths only", () => {
  assert.equal(safeNext("/forum/t/5?page=2"), "/forum/t/5?page=2");
  assert.equal(safeNext("/forum"), "/forum");
  for (const bad of [null, undefined, "", "//evil.example", "https://evil.example", "/\\evil.example", "\\\\evil.example", "t/5", "/\t/evil.example", "/\n/evil.example", "javascript:alert(1)", "/" + "a".repeat(600)]) {
    assert.equal(safeNext(bad), "/forum", String(bad));
  }
  assert.equal(safeNext("//evil.example", "/x"), "/x");
});

test("roleOf: admin list first, then site moderators, else member", () => {
  assert.equal(roleOf("900", false, "100, 900"), "admin");
  assert.equal(roleOf("900", true, "900"), "admin");
  assert.equal(roleOf("5", true, "900"), "mod");
  assert.equal(roleOf("5", false, "900"), "member");
  assert.equal(roleOf(null, false, "900"), "member");
  assert.equal(roleOf("5", false), "member");
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
