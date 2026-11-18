import { test } from "node:test";
import assert from "node:assert/strict";
import { t, getLang } from "../src/i18n/index.ts";

test("t falls back to English and fills vars", () => {
  assert.equal(t("es", "home.threads", { count: 3 }), "3 hilos");
  assert.equal(t("pt", "no.such.key"), "no.such.key");
});

test("getLang reads cookie, then Accept-Language, then en", () => {
  const req = (h: Record<string, string>) => new Request("http://x", { headers: h });
  assert.equal(getLang(req({ cookie: "dmz_lang=pt" })), "pt");
  assert.equal(getLang(req({ "accept-language": "fr, es-MX;q=0.8" })), "es");
  assert.equal(getLang(req({})), "en");
});
