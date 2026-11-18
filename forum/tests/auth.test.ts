import { test } from "node:test";
import assert from "node:assert/strict";
import { sign, verify, safeNext } from "../src/lib/session.ts";
import { roleFor, type GuildInfo } from "../src/lib/roles.ts";
import { rateLimit, isStaff } from "../src/lib/guard.ts";

const SECRET = "test-secret-0123456789-0123456789-abcdef";
const NOW = 1_800_000_000_000;

test("session round trip", () => {
  const cookie = sign(42, NOW + 1000, SECRET);
  assert.match(cookie, /^42\.1800000001000\.[0-9a-f]{64}$/);
  assert.equal(verify(cookie, SECRET, NOW), 42);
});

test("session rejects tampering, expiry and another secret", () => {
  const cookie = sign(42, NOW + 1000, SECRET);
  const [id, expiry, mac] = cookie.split(".");
  assert.equal(verify(`43.${expiry}.${mac}`, SECRET, NOW), null, "tampered id");
  assert.equal(verify(`${id}.${Number(expiry) + 1}.${mac}`, SECRET, NOW), null, "tampered expiry");
  const flipped = (mac[0] === "0" ? "1" : "0") + mac.slice(1);
  assert.equal(verify(`${id}.${expiry}.${flipped}`, SECRET, NOW), null, "tampered signature");
  assert.equal(verify(`${id}.${expiry}.${mac.slice(1)}`, SECRET, NOW), null, "short signature");
  assert.equal(verify(cookie, SECRET, NOW + 1000), null, "expired");
  assert.equal(verify(cookie, SECRET.replace("a", "b"), NOW), null, "other secret");
});

test("session rejects malformed values", () => {
  const mac = sign(1, NOW + 1000, SECRET).split(".")[2];
  for (const value of ["", undefined, null, "garbage", "1.2", "1.2.3.4", `1.5.${mac}`, `abc.${NOW + 1000}.${mac}`,
    `-1.${NOW + 1000}.${mac}`, `0.${NOW + 1000}.${mac}`, `01.${NOW + 1000}.${mac}`]) {
    assert.equal(verify(value, SECRET, NOW), null, String(value));
  }
  // Even with a valid signature, an id that is not a plain positive integer is refused.
  assert.equal(verify(sign(1.5, NOW + 1000, SECRET), SECRET, NOW), null);
  assert.equal(verify(sign(-3, NOW + 1000, SECRET), SECRET, NOW), null);
});

test("a missing or short secret throws instead of signing or verifying", () => {
  for (const secret of ["", "short", "x".repeat(31), undefined as unknown as string]) {
    assert.throws(() => sign(1, NOW + 1000, secret), /SESSION_SECRET/);
    assert.throws(() => verify("1.2.3", secret, NOW), /SESSION_SECRET/);
    assert.throws(() => verify(sign(1, NOW + 1000, SECRET), secret, NOW), /SESSION_SECRET/);
  }
});

test("safeNext keeps same-site paths only", () => {
  assert.equal(safeNext("/t/5?page=2"), "/t/5?page=2");
  assert.equal(safeNext("/"), "/");
  for (const bad of [null, undefined, "", "//evil.example", "https://evil.example", "/\\evil.example", "\\\\evil.example",
    "t/5", "/\t/evil.example", "/\n/evil.example", "javascript:alert(1)", "/auth/logout", "/" + "a".repeat(600)]) {
    assert.equal(safeNext(bad), "/", String(bad));
  }
});

const guild: GuildInfo = {
  ownerId: "100",
  roles: new Map([
    ["1", { name: "@everyone", permissions: 0n }],
    ["2", { name: "moderator", permissions: 0n }],
    ["3", { name: "boss", permissions: 8n }],
    ["4", { name: "helper", permissions: 1n << 13n }],
  ]),
};
const role = (discordId: string, memberRoleIds: string[], extra: Partial<Parameters<typeof roleFor>[0]> = {}) =>
  roleFor({ discordId, adminIds: ["900"], memberRoleIds, guild, modRoleNames: ["moderator"], ...extra });

test("roleFor", () => {
  assert.equal(role("900", []), "admin", "admin list");
  assert.equal(role("900", [], { guild: null }), "admin", "admin list without a guild");
  assert.equal(role("100", ["1"]), "mod", "guild owner");
  assert.equal(role("5", ["1", "3"]), "mod", "Administrator bit");
  assert.equal(role("5", ["2"]), "mod", "role name");
  assert.equal(role("5", ["4"], { modRoleNames: ["4"] }), "mod", "role id");
  assert.equal(role("5", ["1", "4"]), "member", "plain member");
  assert.equal(role("5", ["999"]), "member", "unknown role id");
  assert.equal(role("5", ["2"], { guild: null }), "member", "failed guild lookup");
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
