// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Clerk
import node from "@astrojs/node";
import react from "@astrojs/react";
import clerk from "@clerk/astro";
import { dark } from "@clerk/themes";

// https://astro.build/config
export default defineConfig({
  integrations: [
    clerk({
      appearance: {
        theme: dark,
      },
    }),
    react()
  ],
  server: {
    allowedHosts: true
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['@prisma/client', '.prisma/client']
    }
  },
  adapter: node({ mode: "standalone" }),
  output: "server",
});