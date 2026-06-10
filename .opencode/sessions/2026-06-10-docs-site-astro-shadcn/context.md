# Task Context: Replace MkDocs docs with Astro + shadcn (B/W) + Pagefind

Session ID: 2026-06-10-docs-site-astro-shadcn
Created: 2026-06-10
Status: in_progress

## Current Request

Replace the entire MkDocs Material docs pipeline with a new Astro + MDX + shadcn/ui
(Tailwind v4) + Pagefind docs site. Use a pure grayscale B/W palette with a single
indigo (#6366F1) accent. Sidebar + top nav layout. Bun as the package manager.
Client-side Pagefind search. Full teardown of the old pipeline (mkdocs.yml, all
docs/\*.md, the deploy-docs workflow, AGENTS.md references). Deployed to GitHub Pages
at the existing path `/advanced-homeassistant-mcp/`.

## User-Approved Decisions (from /question)

| Decision            | Choice                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Existing MD content | Rewrite fresh from source — discard all 24 docs/\*.md                                                                 |
| Content format      | MDX with shadcn components embedded                                                                                   |
| Theme               | Pure grayscale B/W with one indigo accent                                                                             |
| Deploy pipeline     | Full teardown + rebuild of the GitHub Pages workflow                                                                  |
| Site structure      | Sidebar + top nav, grouped (Getting Started / Architecture / Tools / Configuration / Deployment / Reference / Guides) |
| Accent color        | Indigo (#6366F1)                                                                                                      |
| Package manager     | Bun (matches the MCP server)                                                                                          |
| Site location       | Separate `docs-site/` at repo root                                                                                    |
| Search              | Client-side Pagefind                                                                                                  |

## Context Files (Standards to Follow)

- `.opencode/context/project-intelligence/technical-domain.md` — bun/TypeScript/ESLint
  conventions for code embedded in docs (e.g. examples must use bun commands, .js
  extensions for relative imports, kebab-case filenames). Note: this file is itself
  stale (mentions Valibot, `lights-tool.ts`, `src/websocket/`); use AGENTS.md as the
  source of truth for current state.

## Reference Files (Source Material to Look At)

- `AGENTS.md` — canonical description of the current state of the MCP server
  (3 entry points, Zod validation, esbuild build, bun runtime, JWT_SECRET ≥32 chars,
  src/hass/ for HA client, src/tools/ + src/tools/homeassistant/ for tools).
- `package.json` — scripts, dependencies, current version (1.4.0).
- `src/config/app.config.ts` — Zod schema with all real env var names
  (HASS_HOST, HASS_TOKEN, JWT_SECRET, SPEECH.\*, RATE_LIMIT, SSE, LOGGING).
- `src/tools/` and `src/tools/homeassistant/` — actual tool list and behaviour.
- `mkdocs.yml` — current nav structure; we'll port the topic groupings.
- `.github/workflows/deploy-docs.yml` — current deploy flow we're replacing.
- `README.md` — current high-level description; we'll prune docs references.

## External Docs to Fetch (via ExternalScout, before bootstrap)

1. **Astro v5** — content collections API, MDX integration, `astro.config.mjs`
   for GitHub Pages base path, `@astrojs/mdx` config, deploy action reference.
2. **Tailwind CSS v4** — Vite plugin (`@tailwindcss/vite`), `@theme inline`
   pattern, CSS variable mapping, shadcn-style tokens.
3. **shadcn/ui + Astro** — verify current CLI support for Astro, what registry
   to use, which components are HTML-first vs React-island.
4. **Pagefind** — Astro integration, build-time index, UI component snippet,
   `astro-pagefind` (or equivalent).

## Components (Functional Units)

1. **Teardown** — delete old mkdocs files, docs/\*.md, deploy workflow, site/ dir.
2. **Bootstrap** — create `docs-site/` with bun, install astro/mdx/tailwind v4/pagefind.
3. **Theme** — shadcn grayscale B/W + indigo accent tokens in `src/styles/global.css`.
4. **shadcn setup** — `components.json`, base components (Button, Card, etc.),
   `cn()` util.
5. **Layout shell** — `BaseLayout.astro`, `Sidebar.astro`, `TopNav.astro`,
   `Prose.astro`, `CodeBlock.astro` (Shiki), `ModeToggle.astro`.
6. **Content collections** — typed `src/content/config.ts` schema for `docs/`.
7. **MDX pages** — write ~15-18 pages from scratch using the actual codebase.
8. **Pagefind search** — `Cmd+K` modal + index.
9. **Deploy workflow** — new `.github/workflows/deploy-docs.yml`.
10. **README + AGENTS.md update** — point to the new docs.

## Constraints

- **Bun everywhere**: `bun create astro`, `bun install`, `bun run dev`,
  `bun run build`. No pnpm/npm fallback scripts in the docs site.
- **shadcn CLI** uses `bunx --bun shadcn@latest` to dodge known postinstall issues.
- **Base path**: `astro.config.mjs` must set `base: '/advanced-homeassistant-mcp'`
  to match the existing GitHub Pages URL.
- **No React islands** unless strictly needed (search modal, theme toggle).
  Pure HTML/Astro components for everything else.
- **TypeScript strict** in docs-site/tsconfig.json (per project standards).
- **No emoji** in code or rendered content (matches main project's "no emoji
  unless requested" rule).
- **AGENTS.md is the source of truth** for what the MCP server actually does —
  do not rely on the stale markdown docs as reference.

## Site Map (final nav structure)

- **Getting Started**
  - Introduction (`/`)
  - Installation
  - Quick Start
  - First Conversation
- **Architecture**
  - Overview
  - MCP Transports
  - Tools System
  - Home Assistant Client
  - Security Model
- **Configuration**
  - Environment Variables
  - Tool Annotations
  - Speech (optional)
  - Rate Limiting
- **Tools Reference**
  - Generic Tools (search-entities, control, history, dashboard, ...)
  - Home Assistant Tools (lights, climate, switch, scene, ...)
  - Annotations & Trust
- **Deployment**
  - Docker
  - Smithery
  - Standalone
  - Health Checks
- **Reference**
  - Environment Variables (full)
  - API Endpoints
  - Changelog
- **Guides**
  - Troubleshooting
  - Performance
  - Contributing
  - FAQ
  - Security

## Exit Criteria

- [ ] All old docs (mkdocs.yml, docs/\*.md, deploy-docs.yml, site/) deleted.
- [ ] `docs-site/` builds cleanly with `bun run build`, output in `docs-site/dist/`.
- [ ] shadcn grayscale B/W + indigo theme is in effect on all pages.
- [ ] Sidebar + top nav renders with grouped nav across all routes.
- [ ] At least 15 MDX pages written, all using the real codebase state
      (no Valibot, no `src/websocket/`, no LiteMCP, no `--http` flag, etc.).
- [ ] `Cmd+K` search modal works (Pagefind index generated at build).
- [ ] New `.github/workflows/deploy-docs.yml` deploys to GitHub Pages
      (validated by `bun run build` succeeding locally).
- [ ] Dark mode toggle works (uses shadcn's `.dark` class + `prefers-color-scheme`).
- [ ] `README.md` updated to link to the new docs site.
- [ ] `AGENTS.md` documents the new docs build/dev commands and the new deploy flow.
- [ ] Each edit committed atomically with a focused message.
- [ ] `bun x tsc --noEmit` (in docs-site) passes with 0 errors.
- [ ] `bun run build` in docs-site passes with 0 errors and 0 warnings.
