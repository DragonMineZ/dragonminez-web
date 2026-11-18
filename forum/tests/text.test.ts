import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown, excerpt } from "../src/lib/text.ts";
import { threadSchema, replySchema, reportSchema } from "../src/lib/schemas.ts";

test("raw HTML and script tags come out escaped", () => {
  const html = renderMarkdown("<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>");
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("only http(s) links produce an href", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,<b>x</b>", "vbscript:msgbox(1)", "JaVaScRiPt:alert(1)", "mailto:a@b.c"]) {
    assert.ok(!renderMarkdown(`[x](${url})`).includes("href"), url);
  }
  assert.match(renderMarkdown("[x](https://example.com)"), /href="https:\/\/example\.com"/);
});

test("links get nofollow ugc noopener and open in a new tab, autolinks too", () => {
  for (const src of ["[x](https://example.com)", "see https://example.com/a now", "see http://example.com"]) {
    const html = renderMarkdown(src);
    assert.match(html, /rel="nofollow ugc noopener"/, src);
    assert.match(html, /target="_blank"/, src);
  }
});

test("images: https only, lazy, no referrer; the rest become alt text", () => {
  const ok = renderMarkdown("![cat](https://example.com/a.png)");
  assert.match(ok, /<img src="https:\/\/example\.com\/a\.png" alt="cat" loading="lazy" referrerpolicy="no-referrer">/);
  const http = renderMarkdown("![a](http://x/y.png)");
  assert.ok(!http.includes("<img"));
  assert.ok(http.includes("a"));
  for (const url of ["javascript:alert(1)", "data:image/png;base64,AAAA"]) {
    assert.ok(!renderMarkdown(`![a](${url})`).includes("<img"), url);
  }
});

test("alt text and titles cannot inject attributes", () => {
  const html = renderMarkdown('![x" onerror="alert(1)](https://example.com/a.png "t\\" onload=\\"alert(2)")');
  const attrs = [...(/<img ([^>]*)>/.exec(html)?.[1] ?? "").matchAll(/(\w+)="/g)].map((m) => m[1]);
  assert.deepEqual(attrs, ["src", "alt", "loading", "referrerpolicy"], html);
  const link = renderMarkdown('[x](https://example.com "a\\" onclick=\\"alert(1)")');
  assert.ok(!link.includes(' onclick="'), link);
});

test("markdown features render, tables included", () => {
  const html = renderMarkdown("# H\n\n**b** *i* ~~s~~\n\n- a\n- b\n\n> q\n\n`c`\n\n| a | b |\n|---|---|\n| 1 | 2 |");
  for (const tag of ["<h1>", "<strong>", "<em>", "<s>", "<ul>", "<blockquote>", "<code>", "<table>"]) {
    assert.ok(html.includes(tag), tag);
  }
});

test("excerpt strips markdown and truncates", () => {
  assert.equal(excerpt("# Title\n\n**bold** and [link](https://x.com) ![alt](https://x.com/a.png)", 100), "Title bold and link alt");
  const cut = excerpt("a".repeat(50), 10);
  assert.equal(cut.length, 10);
  assert.ok(cut.endsWith("…"));
});

test("schemas trim and enforce ranges", () => {
  assert.deepEqual(threadSchema.parse({ title: "  Hello world  ", body: " hi " }), { title: "Hello world", body: "hi" });
  assert.ok(!threadSchema.safeParse({ title: "four", body: "x" }).success);
  assert.ok(!threadSchema.safeParse({ title: "x".repeat(121), body: "x" }).success);
  assert.ok(threadSchema.safeParse({ title: "x".repeat(120), body: "x".repeat(5000) }).success);
  assert.ok(!threadSchema.safeParse({ title: "Hello", body: "x".repeat(5001) }).success);
  assert.ok(!threadSchema.safeParse({ title: "Hello", body: "   " }).success);
  assert.ok(!replySchema.safeParse({ body: "" }).success);
  assert.ok(!replySchema.safeParse({ body: "x".repeat(5001) }).success);
  assert.ok(replySchema.safeParse({ body: "ok" }).success);
  assert.ok(!reportSchema.safeParse({ reason: "abcd" }).success);
  assert.ok(!reportSchema.safeParse({ reason: "x".repeat(301) }).success);
  assert.ok(reportSchema.safeParse({ reason: "spam spam" }).success);
});
