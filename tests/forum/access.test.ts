import { test } from "node:test";
import assert from "node:assert/strict";
import { forumLocked, mayEnter, openWhenLocked } from "../../src/lib/forum/access.ts";

test("the forum is locked unless FORUM_PUBLIC is exactly 1", () => {
  assert.equal(forumLocked(undefined), true);
  assert.equal(forumLocked(""), true);
  assert.equal(forumLocked("0"), true);
  assert.equal(forumLocked("true"), true);
  assert.equal(forumLocked("1"), false);
});

test("only the holding page and the login page are open while locked", () => {
  for (const ok of ["/forum/locked", "/forum/login"]) {
    assert.equal(openWhenLocked(ok), true, ok);
  }
  for (const no of ["/forum", "/forum/c/announcements", "/forum/t/1", "/forum/servers", "/forum/u/1", "/forum/search", "/api/forum/preview", "/forum/mod", "/forum/act/like", "/forum/loginx", "/forum/locked/x"]) {
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
