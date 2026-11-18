import { test } from "node:test";
import assert from "node:assert/strict";
import { likeEscape, normalizeQuery, notificationHref, postPage } from "../src/lib/links.ts";

test("likeEscape makes LIKE wildcards literal", () => {
  assert.equal(likeEscape("100%_done"), "100\\%\\_done");
  assert.equal(likeEscape("a\\b"), "a\\\\b");
  assert.equal(likeEscape("plain"), "plain");
});

test("normalizeQuery trims and enforces 2 to 80 characters", () => {
  assert.equal(normalizeQuery("  goku  "), "goku");
  assert.equal(normalizeQuery("a"), null);
  assert.equal(normalizeQuery("  a  "), null);
  assert.equal(normalizeQuery(null), null);
  assert.equal(normalizeQuery("x".repeat(80)), "x".repeat(80));
  assert.equal(normalizeQuery("x".repeat(81)), null);
  assert.equal(normalizeQuery("100%_<script>"), "100%_<script>");
});

test("postPage counts 20 per page and skips the opening post of server threads", () => {
  assert.equal(postPage(1, false), 1);
  assert.equal(postPage(20, false), 1);
  assert.equal(postPage(21, false), 2);
  assert.equal(postPage(1, true), 1);
  assert.equal(postPage(21, true), 1);
  assert.equal(postPage(22, true), 2);
});

test("notificationHref points at the post's page or the server, and is null for missing targets", () => {
  const reply = { type: "reply", threadId: 7, postId: 40, serverId: null };
  assert.equal(notificationHref(reply, { thread: true, server: false, page: 3 }), "/t/7?page=3#post-40");
  assert.equal(notificationHref(reply, { thread: true, server: false, page: 1 }), "/t/7#post-40");
  assert.equal(notificationHref(reply, { thread: false, server: false, page: 1 }), null);
  const approved = { type: "server_approved", threadId: 7, postId: null, serverId: 2 };
  assert.equal(notificationHref(approved, { thread: true, server: true, page: 1 }), "/servers/2");
  assert.equal(notificationHref(approved, { thread: true, server: false, page: 1 }), null);
});
