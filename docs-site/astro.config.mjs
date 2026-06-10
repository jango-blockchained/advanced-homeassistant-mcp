// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
//
// Base path is set to the GitHub Pages project URL. When deploying to
// a custom domain this should be removed.
export default defineConfig({
  site: "https://jango-blockchained.github.io",
  base: "/advanced-homeassistant-mcp",
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    // Shiki handles syntax highlighting at build time. We don't need
    // MDX remark plugins yet but this is the place to add them.
    shikiConfig: {
      theme: "github-dark-dimmed",
      wrap: true,
    },
  },
});
