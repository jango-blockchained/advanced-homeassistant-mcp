/**
 * Rehype plugin: prepends a base URL to all internal absolute links
 * (`href="/..."`) in rendered Markdown/MDX content.
 *
 * This ensures links like `/getting-started/installation/` resolve
 * correctly when the site is deployed under a base path (e.g.
 * `/advanced-homeassistant-mcp/` on GitHub Pages).
 *
 * Usage in astro.config.mjs:
 *   import rehypeBaseUrl from './src/lib/rehype-base-url.mjs';
 *   // ...
 *   markdown: { rehypePlugins: [[rehypeBaseUrl, { base: "/your-base-path" }]] }
 */
import { visit } from "unist-util-visit";

/** @type {import('unified').Plugin<[{base: string}], import('hast').Root>} */
export default function rehypeBaseUrl({ base } = {}) {
  return (tree) => {
    if (!base || base === "/") return;

    visit(tree, "element", (node) => {
      if (node.tagName === "a" && typeof node.properties?.href === "string") {
        const href = node.properties.href;

        // Only touch internal absolute paths — skip external URLs,
        // anchor links, protocol-relative URLs, and already-prefixed links.
        if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith(base)) {
          node.properties.href = `${base.replace(/\/$/, "")}${href}`;
        }
      }
    });
  };
}
