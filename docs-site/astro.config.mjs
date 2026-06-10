// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
//
// Base path is set to the GitHub Pages project URL. When deploying to
// a custom domain this should be removed.
export default defineConfig({
  site: "https://jango-blockchained.github.io",
  base: "/advanced-homeassistant-mcp",
  integrations: [mdx(), react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark-dimmed",
      wrap: true,
    },
  },
});
