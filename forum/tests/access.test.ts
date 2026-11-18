import { test } from "node:test";
import assert from "node:assert/strict";
import { forumLocked, mayEnter, openWhenLocked } from "../src/lib/access.ts";

test("the forum is locked unless FORUM_PUBLIC is exactly 1", () => {
  assert.equal(forumLocked(undefined), true);
  assert.equal(forumLocked(""), true);
  assert.equal(forumLocked("0"), true);
  assert.equal(forumLocked("true"), true);
  assert.equal(forumLocked("1"), false);
});

test("only login, language, the holding page and assets are open while locked", () => {
  for (const ok of ["/auth/login", "/auth/callback", "/auth/logout", "/lang/es", "/locked", "/_astro/app.js", "/_image"]) {
    assert.equal(openWhenLocked(ok), true, ok);
  }
  for (const no of ["/", "/c/announcements", "/t/1", "/servers", "/u/1", "/search", "/api/preview", "/mod", "/forum/like", "/auth/loginx", "/lang/spanish"]) {
    assert.equal(openWhenLocked(no), false, no);
  }
});

test("only a logged-in, not banned moderator or admin may enter", () => {
  assert.equal(mayEnter(null), false);
  assert.equal(mayEnter({ role: "member", banned: false }), false);
  assert.equal(mayEnter({ role: "mod", banned: false }), true);
  assert.equal(mayEnter({ role: "admin", banned: false }), true);
  assert.equal(mayEnter({ role: "admin", banned: true }), false);
});
