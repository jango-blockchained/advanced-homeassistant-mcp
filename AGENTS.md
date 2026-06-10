# Agent Instructions

## Commands
- **Build**: `bun run build:all` (esbuild → `dist/`, CommonJS)
- **Single test**: `bun test __tests__/path/to/file.test.ts`
- **All tests**: `bun test` (auto-preloads `test/setup.ts` per `bunfig.toml`)
- **Typecheck**: `bun x tsc --noEmit` (tsconfig is typecheck-only, not used by build)
- **Lint**: `bun run lint`
- **Format**: `bun run format`

## Architecture
- **Three entry points**: `src/index.ts` (HTTP/WS), `src/stdio-server.ts` (STDIO), `src/http-server.ts` (HTTP-only)
- **MCP core**: `src/mcp/MCPServer.ts` (custom) + `src/mcp/transports/` (transport layers)
- **Tools**: `src/mcp/tools/homeassistant/` (domain-specific), `src/mcp/tools/` (generic)
- **HA client**: `src/hass/` (WebSocket API client)
- **Build output**: `dist/` with external deps (esbuild config in `package.json` scripts)

## Module System
- **Source**: TypeScript with ESM-style imports, path aliases `@/*` → `src/*`
- **Build**: esbuild outputs CommonJS (`.cjs`) and ESM (`.mjs`) — NOT tsc
- **Imports**: NO `.js` extensions (esbuild resolves this)
  ```typescript
  // Correct
  import { MCPServer } from '@/mcp/MCPServer';
  // Wrong
  import { MCPServer } from '@/mcp/MCPServer.js';
  ```

## Testing Gotchas
- **Preload required**: `test/setup.ts` sets `HASS_TOKEN`, `JWT_SECRET`, and other env vars
- **Coverage thresholds**: 80% statements/lines/functions, 70% branches (see `bunfig.toml`)
- **Test location**: `__tests__/` directory (not `src/` or `test/`)
- **Config**: `bunfig.toml` `[test]` section controls test behavior

## Important Patterns
- **Logging**: Use `winston` logger from `@/utils/logger`, never `console.log`
- **Error handling**: Always check `instanceof Error` before accessing `.message`
  ```typescript
  catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
  }
  ```
- **External deps**: Listed in esbuild `--external` flags (not bundled)

## Smithery Deployment
- **Entry**: `src/smithery-sdk.ts` (minimal MCP implementation)
- **Build**: `bun run smithery:build` → `dist/smithery.js`
- **Local debug**: `npx @smithery/cli playground-stdio -- npm run start:stdio`

## Environment
- **Runtime**: Bun (dev/test), Node.js >=18 (production)
- **Config**: `src/config.ts` loads from `dotenv`, validates with Valibot
- **TypeScript**: Strict mode enabled, `bun-types` in type array
