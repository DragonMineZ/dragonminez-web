// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://forum.dragonminez.com/",
  integrations: [react()],
  adapter: node({ mode: "standalone" }),
  output: "server",
  security: {
    // POST forms must come from this origin (src/middleware.ts extends it to every write).
    checkOrigin: true,
    // Behind the TLS proxy, trust its X-Forwarded-* for this host so the origin check sees https.
    allowedDomains: [{ hostname: "forum.dragonminez.com" }],
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: { alias: { "@": "/src" } },
    ssr: { external: ["@prisma/client", ".prisma/client"] },
  },
});
