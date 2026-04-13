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
    ssr: {
      external: ['@prisma/client', '.prisma/client']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three')) return 'three';
              if (id.includes('react')) return 'react-vendor';
              return 'vendor';
            }
          }
        }
      }
    }
  },
  adapter: node({ mode: "standalone" }),
  output: "server",
});