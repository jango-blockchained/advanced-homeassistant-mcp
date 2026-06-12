/**
 * Resolve an absolute path relative to the Astro base URL.
 *
 * Usage in `.astro` component templates:
 *   <a href={link("/getting-started/installation/")}>
 *
 * The base URL (e.g. `/advanced-homeassistant-mcp`) is automatically
 * prepended when the site is deployed to a sub-path, and produces a
 * plain `/` link in local dev.
 */
export function link(path: string): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path}`;
}
