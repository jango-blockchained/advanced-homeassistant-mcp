# Home Assistant MCP — Docs

Astro + MDX + Tailwind v4 + shadcn-style components. Pure grayscale B/W with a
single indigo accent.

## Develop

From this directory:

```bash
bun install
bun run dev      # local dev server on http://localhost:4321
bun run build    # production build to ./dist
bun run preview  # preview the production build
bun x astro check # type check
```

## Project layout

```
src/
├── content/         # MDX content collections (added in subtask 6)
├── components/      # Astro + React UI components
├── layouts/         # BaseLayout, DocLayout (added in subtask 4)
├── lib/             # Utilities (cn())
├── nav.ts           # Sidebar navigation config (added in subtask 4)
├── pages/           # Routes
└── styles/
    └── global.css   # Tailwind v4 + CSS variable theme tokens
```

## Theme

The palette is a pure grayscale ramp with a single accent (indigo `#6366F1`)
used for focus rings, links, and the `--ring` token. All semantic tokens live
in `src/styles/global.css` and are wired to Tailwind v4 utilities via the
`@theme inline` block.

## Deploying

`.github/workflows/deploy-docs.yml` builds this site on push to `main` and
deploys to GitHub Pages. The base path is `/advanced-homeassistant-mcp` to
match the project URL.
