import en from "./en.ts";
import es from "./es.ts";
import pt from "./pt.ts";

export const LANGS = ["en", "es", "pt"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_NAMES: Record<Lang, string> = { en: "English", es: "Español", pt: "Português" };

const tables: Record<Lang, Record<string, string>> = { en, es, pt };

export function t(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  const text = tables[lang][key] ?? en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

function pick(code: string | undefined | null): Lang | null {
  const base = code?.trim().toLowerCase().slice(0, 2);
  return (LANGS as readonly string[]).includes(base ?? "") ? (base as Lang) : null;
}

export function getLang(request: Request): Lang {
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)dmz_lang=([^;]*)/)?.[1];
  const fromCookie = pick(decodeURIComponent(cookie ?? ""));
  if (fromCookie) return fromCookie;
  for (const part of (request.headers.get("accept-language") ?? "").split(",")) {
    const found = pick(part.split(";")[0]);
    if (found) return found;
  }
  return "en";
}

export function timeAgo(lang: Lang, date: Date): string {
  const s = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (s < 60) return t(lang, "time.now");
  if (s < 3600) return t(lang, "time.minutes", { n: Math.floor(s / 60) });
  if (s < 86400) return t(lang, "time.hours", { n: Math.floor(s / 3600) });
  return t(lang, "time.days", { n: Math.floor(s / 86400) });
}
