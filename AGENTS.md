# Agent Instructions

> **Note**: This file was updated 2026-06-10 as part of a project audit and cleanup.
> Several claims below were corrected to match the current state of the repo
> after removal of dead code, dependency cleanup, and config consolidation.

## Commands

- **Build (all 3 entry points)**: `bun run build:all` (esbuild → `dist/`, minified, with inline sourcemaps)
- **Single test**: `bun test __tests__/path/to/file.test.ts`
- **All tests**: `bun test` (auto-preloads `test/setup.ts` per `bunfig.toml`)
- **Typecheck**: `bun x tsc --noEmit` (tsconfig is typecheck-only, not used by build)
- **Lint**: `bun run lint`
- **Format**: `bun run format`
- **Clean**: `bun run clean` (removes `dist/`, `dist-ts/`, `.bun/`, `coverage/`, `bin/*.js`)

## Architecture

- **Three entry points** (post-cleanup):
  - `src/index.ts` → `dist/index.cjs` — HTTP+WS, custom `MCPServer` (Express)
  - `src/stdio-server.ts` → `dist/stdio-server.mjs` — STDIO, `fastmcp` v3
  - `src/http-server.ts` → `dist/http-server.mjs` — HTTP, `fastmcp` v3
- **MCP core**: `src/mcp/MCPServer.ts` (custom) + `src/mcp/transports/` (transport layers)
- **Tools**: `src/tools/homeassistant/` (domain-specific), `src/tools/` (generic) — **not** under `src/mcp/`
- **HA client**: `src/hass/` (WebSocket API client)
- **Build output**: `dist/` with external deps (esbuild config in `package.json` scripts)

## Module System

- **Source**: TypeScript with ESM-style imports, path alias `@/*` → `src/*`
- **Build**: esbuild outputs CJS (`.cjs`) and ESM (`.mjs`) — NOT tsc
- **Imports**: `.js` extensions are **required** for relative imports (esbuild resolves to `.ts` source); the project uses them throughout
  ```typescript
  // Correct (matches current codebase)
  import { MCPServer } from "@/mcp/MCPServer";
  // or
  import { MCPServer } from "../mcp/MCPServer.js";
  ```
- **tsconfig**: `module: ESNext`, `moduleResolution: Bundler` (matches `package.json#type: module`)

## Testing Gotchas

- **Preload required**: `test/setup.ts` sets `HASS_TOKEN`, `JWT_SECRET`, and other env vars
- **Coverage thresholds**: 80% statements/lines/functions, 70% branches (see `bunfig.toml`)
- **Test location**: `__tests__/` directory (not `src/` or `test/`)
- **E2E tests**: under `__tests__/integration/` (not `test/e2e/` which was removed)
- **Config**: `bunfig.toml` `[test]` section controls test behavior; `testMatch` only matches `.test.ts` (no `.js`, no `.disabled`)

## Important Patterns

- **Logging**: Use `winston` logger from `@/utils/logger`, never `console.log`
- **Error handling**: Always check `instanceof Error` before accessing `.message`
  ```typescript
  catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
  }
  ```
- **External deps**: Listed in esbuild `--external` flags (not bundled). Keep this list in sync with `package.json#dependencies`.
- **Config**: Import from `src/config/app.config` (single source of truth). The legacy `src/config.ts` and `src/config.js` are gone.
- **Validation**: Zod (NOT Valibot, despite earlier docs). Schemas live in `src/schemas/`.

## Smithery Deployment

- **Entry**: `src/smithery-sdk.ts` (uses `@modelcontextprotocol/sdk`)
- **Build**: `bun run smithery:build` → `dist/smithery.js`
- **Container**: `Dockerfile.smithery` builds `dist/http-simple.mjs` (the simple HTTP server)
- **Local debug**: `npx @smithery/cli playground-stdio -- npm run start:stdio`

## Environment

- **Runtime**: Bun (dev/test/build), Node.js >=18 (production)
- **Config**: `src/config/app.config.ts` loads from `dotenv`, validates with **Zod** (Valibot was removed)
- **Lockfile**: `bun.lock` is canonical; `package-lock.json` is also present for npm fallback
- **TypeScript**: Strict mode enabled, `bun-types` in type array
