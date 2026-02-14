// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Clerk
import node from "@astrojs/node";
import clerk from "@clerk/astro";
import { dark } from "@clerk/themes";

// https://astro.build/config
export default defineConfig({
  integrations: [clerk({
      appearance: {
        theme: dark,
      },
    })
  ],
  vite: {
    plugins: [tailwindcss()]
  },
  adapter: node({ mode: "standalone" }),
  output: "server",
});