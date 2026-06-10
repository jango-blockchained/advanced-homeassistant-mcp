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
      // Shiki auto-detects languages from the ```lang fence. We don't
      // restrict the langs list here (Astro's TS types expect
      // LanguageRegistration objects, not strings, and listing the
      // common ones would still leave gaps). All languages Shiki
      // ships with are supported out of the box.
      theme: "github-dark-dimmed",
      wrap: true,
    },
  },
});
