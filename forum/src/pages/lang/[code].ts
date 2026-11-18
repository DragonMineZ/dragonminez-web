import type { APIRoute } from "astro";
import { LANGS } from "@/i18n";

export const GET: APIRoute = ({ params, request, redirect, cookies, url }) => {
  if ((LANGS as readonly string[]).includes(params.code ?? "")) {
    const shared = url.hostname === "dragonminez.com" || url.hostname.endsWith(".dragonminez.com");
    cookies.set("dmz_lang", params.code!, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: url.protocol === "https:",
      ...(shared && { domain: ".dragonminez.com" }),
    });
  }
  let back = "/";
  try {
    const ref = new URL(request.headers.get("referer") ?? "");
    if (ref.origin === url.origin) back = ref.pathname + ref.search;
  } catch {}
  return redirect(back);
};
