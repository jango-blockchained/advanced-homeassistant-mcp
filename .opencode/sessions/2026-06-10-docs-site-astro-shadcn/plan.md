# Implementation Plan: Replace MkDocs with Astro + shadcn (B/W) Docs Site

**Session**: `.opencode/sessions/2026-06-10-docs-site-astro-shadcn/`
**Target file**: `docs-site/` at repo root
**Date**: 2026-06-10

---

## 0. Pre-flight

1. Fetch live docs for: Astro v5, @astrojs/mdx, Tailwind v4 (Vite plugin), shadcn/ui
   - Astro, Pagefind for Astro. Do this BEFORE running any `bun create` so the
     config we generate is current.
2. Confirm: bun ≥ 1.0.26 (project's minimum), Node 18+ available for Pages deploy.
3. Check the current mkdocs.yml nav structure to inform the new sidebar groups.
4. Verify the GitHub Pages URL is still
   `https://jango-blockchained.github.io/advanced-homeassistant-mcp/` (so
   `base: '/advanced-homeassistant-mcp'` is correct).

---

## 1. Teardown of the old pipeline

**Files to delete** (one commit, `chore(docs): remove mkdocs pipeline and old markdown`):

- `mkdocs.yml`
- All of `docs/*.md` (24 files) and `docs/requirements.txt`
- `.github/workflows/deploy-docs.yml`
- `site/` directory (MkDocs build output, if it exists locally)

**Files to update** in the same commit (or follow-up):

- `README.md`: remove the "Documentation" section that links to `docs/index.md`,
  `docs/SMITHERY_DEPLOYMENT.md`, `docs/AUTOMATED_RELEASES.md` (the last is already
  a broken link). Replace with a single line pointing to the new docs site.
- `AGENTS.md`: remove the line about `mkdocs build`. We'll add the new docs build
  commands after the docs site is set up.

**`.gitignore`**: add `docs-site/dist/`, `docs-site/.astro/`, `docs-site/node_modules/`.

---

## 2. Bootstrap the new docs site

In `docs-site/`, run:

```bash
bun create astro@latest . --template minimal --typescript strict --no-install --no-git --skip-houston
bun install
bun add @astrojs/mdx @astrojs/sitemap @astrojs/check @tailwindcss/vite tailwindcss
bun add -d typescript @types/node
```

Pin the Tailwind v4 + Astro combo that we know works together (verify with
ExternalScout before committing versions).

Configure `astro.config.mjs`:

- `output: 'static'`
- `base: '/advanced-homeassistant-mcp'` (GitHub Pages path)
- `site: 'https://jango-blockchained.github.io/advanced-homeassistant-mcp'`
- Integrations: `mdx()`, `sitemap()`
- Vite plugin: `tailwindcss()`

Configure `tsconfig.json`: extend `astro/tsconfigs/strict`, add path alias
`@/*` → `src/*` (per project standards).

---

## 3. shadcn/ui theme + components

shadcn is React-first, so for an Astro site we have two paths:

**Option A (chosen)**: Use shadcn CLI to add components, but only the HTML/Tailwind
ones. The shadcn CLI has an `astro` template. Verify with ExternalScout.
The CLI adds files to `src/components/ui/` and a `lib/utils.ts` with `cn()`.

**Option B (fallback)**: If shadcn CLI doesn't yet support Astro cleanly, copy
the component source manually from shadcn's Tailwind v4 registry (we already
have the URLs from `npx shadcn@latest docs`). The CSS variables and `cn()` are
the same; we just don't run the CLI's auto-add.

For both options, the theme tokens live in `src/styles/global.css` and use
Tailwind v4's `@theme inline` pattern.

### Color tokens (grayscale B/W + indigo accent)

```css
@import "tailwindcss";

:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 3.9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(0 0% 3.9%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(0 0% 3.9%);
  --primary: hsl(0 0% 9%); /* near-black */
  --primary-foreground: hsl(0 0% 98%);
  --secondary: hsl(0 0% 96.1%);
  --secondary-foreground: hsl(0 0% 9%);
  --muted: hsl(0 0% 96.1%);
  --muted-foreground: hsl(0 0% 45.1%);
  --accent: hsl(0 0% 96.1%);
  --accent-foreground: hsl(0 0% 9%);
  --destructive: hsl(0 0% 30%); /* dark gray instead of red — pure B/W */
  --destructive-foreground: hsl(0 0% 98%);
  --border: hsl(0 0% 89.8%);
  --input: hsl(0 0% 89.8%);
  --ring: hsl(239 84% 67%); /* indigo-500 (#6366F1) */
  --chart-1: hsl(0 0% 20%);
  --chart-2: hsl(0 0% 40%);
  --chart-3: hsl(0 0% 60%);
  --chart-4: hsl(0 0% 80%);
  --chart-5: hsl(0 0% 95%);
  --sidebar: hsl(0 0% 98%);
  --sidebar-foreground: hsl(0 0% 9%);
  --sidebar-primary: hsl(0 0% 9%);
  --sidebar-primary-foreground: hsl(0 0% 98%);
  --sidebar-accent: hsl(0 0% 94%);
  --sidebar-accent-foreground: hsl(0 0% 9%);
  --sidebar-border: hsl(0 0% 91%);
  --sidebar-ring: hsl(239 84% 67%);
  --radius: 0.5rem;
}

.dark {
  --background: hsl(0 0% 3.9%);
  --foreground: hsl(0 0% 98%);
  --card: hsl(0 0% 5.9%);
  --card-foreground: hsl(0 0% 98%);
  --popover: hsl(0 0% 5.9%);
  --popover-foreground: hsl(0 0% 98%);
  --primary: hsl(0 0% 98%);
  --primary-foreground: hsl(0 0% 9%);
  --secondary: hsl(0 0% 14.9%);
  --secondary-foreground: hsl(0 0% 98%);
  --muted: hsl(0 0% 14.9%);
  --muted-foreground: hsl(0 0% 63.9%);
  --accent: hsl(0 0% 14.9%);
  --accent-foreground: hsl(0 0% 98%);
  --destructive: hsl(0 0% 60%);
  --destructive-foreground: hsl(0 0% 9%);
  --border: hsl(0 0% 14.9%);
  --input: hsl(0 0% 14.9%);
  --ring: hsl(239 84% 67%);
  --chart-1: hsl(0 0% 80%);
  --chart-2: hsl(0 0% 60%);
  --chart-3: hsl(0 0% 40%);
  --chart-4: hsl(0 0% 25%);
  --chart-5: hsl(0 0% 15%);
  --sidebar: hsl(0 0% 7%);
  --sidebar-foreground: hsl(0 0% 98%);
  --sidebar-primary: hsl(0 0% 98%);
  --sidebar-primary-foreground: hsl(0 0% 9%);
  --sidebar-accent: hsl(0 0% 14%);
  --sidebar-accent-foreground: hsl(0 0% 98%);
  --sidebar-border: hsl(0 0% 14%);
  --sidebar-ring: hsl(239 84% 67%);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, "Cascadia Code", "Source Code Pro", monospace;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings:
      "rlig" 1,
      "calt" 1;
  }
}
```

### Components to install (via `bunx --bun shadcn@latest add`)

- `button`
- `card`
- `tabs`
- `accordion`
- `badge`
- `separator`
- `sheet` (for mobile sidebar)
- `dropdown-menu` (for theme toggle, GitHub link)
- `tooltip`
- `kbd` (for `Cmd+K` shortcut)
- `command` (for search modal — may need a thin React island)

For each one, **read the added file** to verify it matches Astro's HTML-first
expectations. Components that use React hooks (Sheet, DropdownMenu, Command)
need to live in a `*.tsx` file with `client:load` directive at the call site.
Pure HTML ones (Button, Card, Tabs, Accordion, Badge, Separator) work as
Astro components.

---

## 4. Layout shell (Astro components)

### `src/layouts/BaseLayout.astro`

The root layout. Sets `<html>`, `<head>` (meta, fonts, CSS), `<body>`,
imports the theme detection script, wraps the page in `Sidebar` + `TopNav` +
main content slot. Includes a small inline script that reads
`localStorage.theme` and applies `.dark` to `<html>` before paint (no flash).

### `src/components/Sidebar.astro`

Two-column:

- **Left rail (full height, 240px)**: logo, version, grouped nav, GitHub link.
- **Main content area (rest of width)**: `<slot />` from BaseLayout.

The nav is data-driven from `src/nav.ts` (typed, easy to update).

### `src/components/TopNav.astro`

Thin bar above the content area. On the left: current section label. On the
right: search trigger button (opens a Command dialog), theme toggle, GitHub
icon.

### `src/components/Prose.astro`

Wraps MDX content. Applies typography (max-width, line-height, headings,
links, lists, code blocks, callouts, tables). Pure CSS via Tailwind utilities
scoped to a `.prose` class.

### `src/components/CodeBlock.astro`

Wraps the default `<pre><code>` rendering. Uses Astro/Shiki for syntax
highlighting. Adds a copy button (small inline script — no React needed).
Supports `lang="..."` attribute for shiki languages.

### `src/components/ModeToggle.astro`

Theme toggle button. Uses an inline script that toggles `.dark` on `<html>`
and persists to `localStorage`. Renders a sun/moon icon based on current state.

### `src/components/Search.astro`

Search button + modal. The button is a static `<button>`. The modal uses
`@astrojs/pagefind` (or static Pagefind UI) — fetches the index at runtime,
filters as the user types. The modal itself is a small React island
(`SearchModal.tsx`) using shadcn's `command` component. We accept the React
overhead here because search is the single most interactive feature and
re-implementing the filter logic in vanilla JS is not worth it.

---

## 5. Content collections (typed MDX)

### `src/content/config.ts`

```ts
import { defineCollection, z } from "astro:content";

const docs = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    section: z.enum(["getting-started", "architecture", "configuration", "tools", "deployment", "reference", "guides"]),
    order: z.number().default(100),
    draft: z.boolean().default(false),
  }),
});

export const collections = { docs };
```

### `src/nav.ts`

The sidebar config. One entry per section, each with grouped links. Hard-code
the order; don't rely on alphabetical sorting. Example:

```ts
export const nav = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/" },
      { title: "Installation", href: "/installation" },
      { title: "Quick Start", href: "/quick-start" },
      { title: "First Conversation", href: "/first-conversation" },
    ],
  },
  // ...
];
```

---

## 6. MDX pages (~15 pages)

Each page lives at `src/content/docs/<slug>.mdx`. Front-matter provides title,
section, order. Content is rewritten from the real codebase (no Valibot, no
LiteMCP, no `src/websocket/`, etc.).

**Getting Started** (4):

- `index.mdx` — Introduction: what the project is, the three entry points
  (HTTP+WS via custom MCPServer, FastMCP v3 STDIO, FastMCP v3 HTTP), the three
  build outputs (`dist/index.cjs`, `dist/stdio-server.mjs`, `dist/http-server.mjs`).
- `installation.mdx` — Bun/Node prerequisites, Home Assistant ≥2024.x,
  `HASS_HOST` / `HASS_TOKEN` / `JWT_SECRET` (≥32 chars) env vars, the build
  commands.
- `quick-start.mdx` — Clone, install, configure, build, run. End-to-end in 5
  steps.
- `first-conversation.mdx` — Connect to Claude Desktop / Cursor, first
  `list_devices` call.

**Architecture** (4):

- `architecture.mdx` — Layer diagram (Transport → Middleware → Tools → HA
  Client), key files, the request lifecycle.
- `transports.mdx` — The three transports: HTTP+WS (custom MCPServer,
  Express, SSE), STDIO (FastMCP v3), HTTP (FastMCP v3). When to use each.
- `tools.mdx` — The Tool interface (Zod-validated, BaseTool generic), how
  tools are registered, how `execute` flows through validation, the Zod
  schema → JSON Schema bridge.
- `security.mdx` — JWT_SECRET requirement (≥32 chars, no default), the
  TokenManager, rate limiting (windowMs/max), helmet, sanitize-html, the
  one-attempt lockout for expired tokens.

**Configuration** (3):

- `environment-variables.mdx` — Full table of env vars from the actual Zod
  schema (HASS_HOST, HASS_TOKEN, JWT_SECRET, PORT, NODE_ENV, SPEECH.\*,
  RATE_LIMIT, SSE, LOGGING). No fabricated env vars.
- `tool-annotations.mdx` — `readOnlyHint`, `destructiveHint`, etc. on
  `ToolAnnotations`. What each means, when to set them.
- `rate-limiting.mdx` — `RATE_LIMIT.windowMs` / `RATE_LIMIT.max`, per-IP
  vs per-token, the api/auth limiters.

**Tools Reference** (2):

- `generic-tools.mdx` — Cards grid for each generic tool (search-entities,
  control, history, dashboard, template, error-log, sse-stats,
  subscribe-events, addon, package, automation-config, entity-state).
  Each card has: name, description, key parameters, example call.
- `homeassistant-tools.mdx` — Same treatment for the 25 HA-specific tools,
  grouped by domain (light, climate, cover, media, fan, lock, scene,
  switch, vacuum, todo, alarm, automation, voice, etc.).

**Deployment** (3):

- `docker.mdx` — The Dockerfile (slim Bun image, no Python/audio by default),
  docker-compose patterns, `HASS_HOST`/`HASS_TOKEN` env injection, health
  checks, exposing the port.
- `smithery.mdx` — `bun run smithery:build` → `dist/smithery.js`,
  `Dockerfile.smithery` for container build, the Smithery playground command.
- `standalone.mdx` — Direct `node dist/index.cjs` (production),
  `bun run start:http` for FastMCP HTTP, `bun run start:stdio` for STDIO.

**Reference** (1, can be split later):

- `api-endpoints.mdx` — The actual HTTP surface from `src/index.ts`:
  `GET /health`, `GET /api/tools` (Swagger UI), MCP JSON-RPC, SSE at `/sse`.

**Guides** (4):

- `troubleshooting.mdx` — Common errors (JWT_SECRET too short, HASS_TOKEN
  wrong, port in use, CORS), debug log levels, where to find logs.
- `contributing.mdx` — Dev setup (`bun install`, `bun test`, `bun run lint`,
  `bun run format`), test conventions (`__tests__/`, 80%/70% coverage),
  commit style.
- `faq.mdx` — 10-15 Q&A based on the GitHub issues / common questions.
- `changelog.mdx` — Pull the current CHANGELOG.md into MDX, format it for
  the docs site.

Total: 19 pages.

---

## 7. Pagefind integration

Install `astro-pagefind` (or use Pagefind's CLI directly). At the end of
`astro.config.mjs`'s build, run `pagefind --site dist`. Index lives at
`dist/pagefind/`. The Search component fetches it on first open.

The `SearchModal` React island is small: read the index, filter results,
render as a list. `< 100 lines`.

---

## 8. Deploy workflow

`.github/workflows/deploy-docs.yml` (replaces the old one):

```yaml
name: Deploy Docs
on:
  push:
    branches: [main]
    paths:
      - "docs-site/**"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: docs-site
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs-site/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## 9. AGENTS.md + README.md updates

In `AGENTS.md`, add a "Documentation" section with:

- `bun --cwd docs-site run dev` — local dev server
- `bun --cwd docs-site run build` — production build
- `bun --cwd docs-site run preview` — preview the production build
- "Deploys automatically on push to `main` via `.github/workflows/deploy-docs.yml`"
- "Lives at https://jango-blockchained.github.io/advanced-homeassistant-mcp/"

In `README.md`, prune the broken links (`docs/SMITHERY_DEPLOYMENT.md` etc.)
and replace the entire "Documentation" section with one paragraph pointing at
the new site URL.

---

## 10. Validation gates

After implementation:

- [ ] `cd docs-site && bun install` — no errors
- [ ] `cd docs-site && bun x astro check` — 0 errors
- [ ] `cd docs-site && bun run build` — succeeds, dist/ has all pages
- [ ] `cd docs-site && bun run preview` — manual smoke test:
  - [ ] Sidebar renders with all sections
  - [ ] Dark mode toggle works (and persists)
  - [ ] `Cmd+K` opens search, finds a known page
  - [ ] No console errors in browser
  - [ ] No 404s on links
- [ ] `git status` clean (only untracked `.antigravitycli/`, `.ctx/`, `.tmp/`)

---

## 11. Commit strategy (atomic, per component)

Following the same "commit each edit" pattern as the rest of the project:

1. `chore(docs): remove mkdocs pipeline and old markdown` — teardown
2. `feat(docs): bootstrap Astro + MDX + Tailwind v4 project` — skeleton
3. `feat(docs): add shadcn grayscale theme with indigo accent` — CSS tokens
4. `feat(docs): add shadcn UI components` — Button, Card, Tabs, etc.
5. `feat(docs): add layout shell (BaseLayout, Sidebar, TopNav)` — chrome
6. `feat(docs): add Prose and CodeBlock components` — typography
7. `feat(docs): add content collection schema` — typed MDX
8. `feat(docs): write Getting Started pages (4)` — content batch 1
9. `feat(docs): write Architecture pages (4)` — content batch 2
10. `feat(docs): write Configuration pages (3)` — content batch 3
11. `feat(docs): write Tools Reference pages (2)` — content batch 4
12. `feat(docs): write Deployment pages (3)` — content batch 5
13. `feat(docs): write Reference + Guides pages (5)` — content batch 6
14. `feat(docs): integrate Pagefind search` — search modal
15. `ci(docs): replace mkdocs deploy with Astro Pages workflow` — deploy
16. `docs(AGENTS): document new docs build commands` — AGENTS.md
17. `docs(README): point to new docs site` — README.md

Each commit must leave the build green.

---

## Open questions (to resolve during implementation)

1. **shadcn CLI + Astro**: does the current CLI support Astro cleanly, or do
   we copy components by hand? Resolve via ExternalScout first.
2. **Pagefind for Astro**: official `astro-pagefind` integration vs. raw
   Pagefind CLI. Pick the lower-friction one.
3. **Font**: do we want to ship a font (e.g. Inter) or use the system stack?
   Default to system stack; can add Inter later if it looks weak.
4. **Logo / favicon**: ship a simple SVG with the project's mark, or skip
   for v1. Skip for v1; use a text-only logo.
5. **Mobile nav**: Sheet (slide-in) for screens < 1024px. Use shadcn Sheet
   with a React island.

---

## Files this plan creates

```
docs-site/
├── astro.config.mjs
├── components.json
├── package.json
├── bun.lock
├── tsconfig.json
├── .gitignore
├── README.md          (small, points to the new docs)
├── public/
│   └── favicon.svg
├── src/
│   ├── content/
│   │   ├── config.ts
│   │   └── docs/
│   │       ├── index.mdx
│   │       ├── installation.mdx
│   │       ├── quick-start.mdx
│   │       ├── first-conversation.mdx
│   │       ├── architecture.mdx
│   │       ├── transports.mdx
│   │       ├── tools.mdx
│   │       ├── security.mdx
│   │       ├── environment-variables.mdx
│   │       ├── tool-annotations.mdx
│   │       ├── rate-limiting.mdx
│   │       ├── generic-tools.mdx
│   │       ├── homeassistant-tools.mdx
│   │       ├── docker.mdx
│   │       ├── smithery.mdx
│   │       ├── standalone.mdx
│   │       ├── api-endpoints.mdx
│   │       ├── troubleshooting.mdx
│   │       ├── contributing.mdx
│   │       ├── faq.mdx
│   │       └── changelog.mdx
│   ├── components/
│   │   ├── ui/                  (shadcn components)
│   │   ├── Sidebar.astro
│   │   ├── TopNav.astro
│   │   ├── Prose.astro
│   │   ├── CodeBlock.astro
│   │   ├── ModeToggle.astro
│   │   ├── Search.astro
│   │   ├── SearchModal.tsx      (React island)
│   │   └── PageHead.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   └── utils.ts             (cn() helper)
│   ├── nav.ts
│   └── styles/
│       └── global.css
```

## Files this plan modifies at the repo root

- `AGENTS.md` — add docs build section
- `README.md` — replace broken docs links with the new site URL
- `.gitignore` — add `docs-site/dist/`, `docs-site/.astro/`, `docs-site/node_modules/`
- `.github/workflows/deploy-docs.yml` — full rewrite for Astro

## Files this plan deletes

- `mkdocs.yml`
- `docs/*.md` (24 files)
- `docs/requirements.txt`
- `site/` (if present)
