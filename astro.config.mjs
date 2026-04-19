// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Clerk
import node from "@astrojs/node";
import react from "@astrojs/react";
import clerk from "@clerk/astro";
import { dark } from "@clerk/themes";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: 'https://dragonminez.com/',
  integrations: [

    clerk({
      appearance: {
        theme: dark,
      },
      signInUrl: "/hairsalon",
      signOutUrl: "/hairsalon",
    }),
    react(),
    sitemap()
  ],
  server: {
    allowedHosts: [
      'superthorough-stacey-psychiatric.ngrok-free.dev',
      'localhost'
    ]
  },
  vite: {

    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    ssr: {
      external: ['@prisma/client', '.prisma/client']
    },

  },
  adapter: node({ mode: "standalone" }),
  output: "server",
});