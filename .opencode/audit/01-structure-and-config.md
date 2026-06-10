# Report 1: Project Structure & Config Overview

**Subagent**: `explore` (ses_14f8dc224ffeB8REty2WvOg5wr)
**Date**: 2026-06-10
**Method**: Read-only inspection of all config files, source tree, and dependencies.

---

## Project Identification

- **Name**: `@jango-blockchained/homeassistant-mcp`
- **Version**: `1.4.0` (`package.json:3`)
- **Description**: Home Assistant Model Context Protocol Server
- **Type**: ESM (`"type": "module"`)
- **License**: MIT
- **Runtime**: Bun (dev/test), Node.js >= 18 (production)

---

## Top-Level Directory Layout

| Path                                                                                    | Purpose                                                                                 |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `AGENTS.md`                                                                             | Agent instructions for the project                                                      |
| `bunfig.toml`                                                                           | Bun runtime + test config                                                               |
| `package.json` / `bun.lock` / `package-lock.json`                                       | **Both npm and Bun lockfiles present** (drift risk)                                     |
| `tsconfig.json` / `tsconfig.docker.json` / `tsconfig.stdio.json` / `tsconfig.test.json` | 4 TypeScript configs (some unused)                                                      |
| `Dockerfile` / `Dockerfile.smithery`                                                    | 2 Dockerfiles                                                                           |
| `docker-compose.yml` / `docker-compose.dev.yml` / `docker-compose.speech.yml`           | 3 compose files                                                                         |
| `smithery.yaml` / `smithery.config.js`                                                  | Smithery deployment                                                                     |
| `dist/`                                                                                 | esbuild output (CJS+ESM) — **6MB committed**                                            |
| `dist-ts/`                                                                              | **Stale tsc output** — not used by any script                                           |
| `docs/` / `site/`                                                                       | MkDocs (22 docs + built site)                                                           |
| `bin/`                                                                                  | NPX entries (`npx-entry.cjs`, `mcp-stdio.cjs`, **`stdio-server.js` 2.2MB artifact**)    |
| `scripts/`                                                                              | benchmark, integration, release, deploy, optimize                                       |
| `src/`                                                                                  | TypeScript source (137 files, ~25,471 lines)                                            |
| `__tests__/`                                                                            | Bun tests (40 files, ~9,212 lines)                                                      |
| `test/`                                                                                 | Preload setup + 1 e2e test                                                              |
| `public/`, `docker/`, `models/`, `logs/`                                                | Static / runtime dirs                                                                   |
| `.github/`                                                                              | CI workflows + issue templates                                                          |
| `.husky/`                                                                               | Pre-commit hooks (broken — see H14)                                                     |
| `.opencode/`                                                                            | Editor/context caches                                                                   |
| `.venv/` / `site/`                                                                      | Python venv + MkDocs output                                                             |
| `.env*`                                                                                 | 5 env files: `.env`, `.env.example`, `.env.development`, `.env.production`, `.env.test` |

---

## Source Tree (`src/`, 137 files, ~25,471 lines)

```
src/
├── index.ts                     # HTTP+WS entry (custom MCPServer)
├── http-server.ts               # HTTP entry (FastMCP v3.22)
├── http-server-new.ts           # DEAD — Express+FastMCP hybrid
├── http-simple.ts               # DEAD — Custom JSON-RPC
├── stdio-server.ts              # STDIO entry (FastMCP v3.22)
├── stdio-only.ts                # DEAD — 41-line minimal
├── smithery.ts                  # DEAD — FastMCP-based
├── smithery-minimal.ts          # DEAD — listed as package.json#module but not built
├── smithery-sdk.ts              # CANONICAL Smithery entry (used by smithery:build)
├── smithery-entry.ts            # DEAD
├── config.ts                    # Config (one of 4 divergent)
├── config.js                    # DEAD — legacy re-export shim
├── commands.ts                  # DEAD — all exports unused
├── health-check.ts              # DEAD — standalone CLI
├── openapi.ts                   # OpenAPI spec
├── polyfills.js                 # DEAD
├── schemas.ts                   # 285 lines, 29/30 schemas unused
├── ai/                          # AI/NLP subsystem
├── api/routes.ts
├── config/                      # 4 different config files!
├── context/index.ts
├── hass/                        # Home Assistant client
├── helpers/                     # Domain helpers
├── interfaces/index.ts          # DEAD — duplicate of types/index.ts
├── mcp/
│   ├── BaseTool.ts
│   ├── MCPServer.ts
│   ├── litemcp.ts               # DEAD — replaced by MCPServer
│   ├── prompts.ts, resources.ts, schema.ts, transport.ts (DEAD), types.ts
│   ├── middleware/index.ts
│   ├── transports/{http,stdio}.transport.ts
│   └── utils/
├── middleware/                  # Express middleware
├── platforms/macos/             # DEAD
├── routes/
├── schemas/                     # Zod schemas
├── security/                    # JWT, rate-limit, sanitize
├── speech/                      # Voice/speech
├── sse/                         # Server-Sent Events
├── tools/                       # 31+ MCP tools
├── types/
├── utils/                       # helpers.ts, logger.ts, log-rotation.ts, stdio-transport.ts (DEAD)
├── websocket/                   # DEAD — replaced by hass/websocket-client.ts
├── __tests__/                   # 10 co-located test files
└── __mocks__/                   # 2 mocks (both unused)
```

### `__tests__/` Structure (40 .ts files, ~9,212 lines)

```
__tests__/
├── ai/{endpoints,nlp}/          # AI subsystem tests
├── api/                         # API tests
├── context/                     # Context tests
├── core/                        # Core server tests (server.test.ts: vestigial)
├── hass/                        # HA client tests
├── integration/                 # E2E integration tests (8 files)
├── mcp/transports/              # Transport tests
├── schemas/                     # Schema tests (devices.test.js is DEAD)
├── security/                    # Security tests
├── speech/                      # Speech tests
├── tools/                       # Tool tests (tool-registry.test.ts.disabled is DEAD)
├── types/                       # litemcp.d.ts is DEAD
├── utils/                       # Test utilities
├── websocket/                   # WebSocket tests
├── helpers.test.ts              # tests dead code in utils/helpers.ts
├── index.test.ts
└── server.test.ts               # uses `expect(true).toBe(true)`
```

### `test/` (2 files)

- `setup.ts` — Bun test preload
- `e2e/automation.test.ts` — DEAD (excluded by bunfig.toml testMatch)

---

## Root Config Files

### `package.json` v1.4.0

- `"type": "module"` (line 31)
- `"main": "dist/index.js"` (line 32) — **wrong, see C8**
- `"module": "src/smithery-minimal.ts"` (line 33) — **broken, see C8**
- `"bin": { "homeassistant-mcp": "bin/npx-entry.cjs" }` (line 34-36)
- 33 production deps, 22 devDeps (full list below)

### `tsconfig.json`

- `target: ESNext`, `module: CommonJS` (MISMATCH with `type:module` — H18)
- Strict mode fully on
- `noEmit: true` (typecheck-only)
- Path alias: `@/*` → `src/*` (only used in 1 file!)

### `bunfig.toml`

- Test preload: `test/setup.ts`
- Coverage: 80% statements/lines/functions, 70% branches
- `testMatch = ["**/__tests__/**/*.test.ts"]` — excludes `.js` tests
- Build: minify on, sourcemap external, entries `[index.ts, stdio-server.ts]`
- `frozen=true` for installs

### `.env.example` (98 lines) — covers 11 sections (Server, HA, Security, Rate Limiting, CORS, AI, Speech, Audio, Whisper, SSE, Test, Docker)

### `.gitignore` (114 lines) — generally complete but missing `bin/*.js` and `dist-ts/`

### `README.md` (537 lines) — heavy on emoji, 6 install paths, 34 tools documented

### `Dockerfile` (104 lines, 2-stage)

- Builder: `oven/bun:1-slim` + Python venv + numpy/scipy
- Runner: `oven/bun:1-slim` + ALSA/PulseAudio, non-root `bunjs` user
- **CMD points to wrong file: `dist/http-server.js`** (C1)

### `docker-compose.yml` (34 lines)

- Default HASS host: **`http://192.168.178.63:8123`** (C14 — personal IP leaked)

---

## Dependency Analysis

### Production Dependencies (32 total)

| Dep                         | Version         | Used?     | Notes                                     |
| --------------------------- | --------------- | --------- | ----------------------------------------- |
| `@anthropic-ai/sdk`         | ^0.39.0         | **NO**    | listed as external but not imported       |
| `@smithery/sdk`             | ^1.7.4          | **NO**    | listed as external but not imported       |
| `@types/express-rate-limit` | ^5.1.3          | type-only | OK                                        |
| `@types/jsonwebtoken`       | ^9.0.5          | type-only | OK                                        |
| `@types/node`               | ^20.11.24       | yes       | OK                                        |
| `@types/sanitize-html`      | ^2.13.0         | type-only | OK                                        |
| `@types/swagger-ui-express` | ^4.1.8          | type-only | OK                                        |
| `@types/ws`                 | ^8.5.10         | type-only | OK                                        |
| `@valibot/to-json-schema`   | ^1.3.0          | **NO**    | only in `build:http-simple` external list |
| `@xmldom/xmldom`            | ^0.9.7          | **NO**    | listed as external but not imported       |
| `better-sqlite3`            | ^12.4.1         | NO direct | via `@smithery/sdk`?                      |
| `chalk`                     | ^5.4.1          | **NO**    | listed as external only                   |
| `cors`                      | ^2.8.5          | yes       | OK                                        |
| `dotenv`                    | ^16.4.7         | yes       | OK                                        |
| `express`                   | ^4.21.2         | yes       | OK                                        |
| `express-rate-limit`        | ^7.5.0          | yes       | OK                                        |
| `fastmcp`                   | ^3.22.0         | yes       | OK                                        |
| `helmet`                    | ^7.1.0          | yes       | OK                                        |
| `jsonwebtoken`              | ^9.0.2          | yes       | OK                                        |
| `minimatch`                 | ^9.0.7          | **NO**    | in deps but no imports                    |
| `node-fetch`                | ^3.3.2          | **NO**    | Node 18+ has native fetch                 |
| `node-record-lpcm16`        | ^1.0.1          | **NO**    | only d.ts declaration                     |
| `openai`                    | ^4.83.0         | **NO**    | only TTS provider names as strings        |
| `openapi-types`             | ^12.1.3         | yes       | OK                                        |
| `sanitize-html`             | ^2.15.0         | yes       | OK                                        |
| `sury`                      | ^11.0.0-alpha.3 | **NO**    | alpha, not imported                       |
| `swagger-ui-express`        | ^5.0.1          | yes       | OK                                        |
| `typescript`                | ^5.3.3          | yes       | **SHOULD be devDep**                      |
| `valibot`                   | ^1.0.0          | **NO**    | AGENTS.md says use it; code uses zod      |
| `winston`                   | ^3.11.0         | yes       | OK                                        |
| `winston-daily-rotate-file` | ^5.0.0          | yes       | OK                                        |
| `ws`                        | ^8.16.0         | yes       | OK                                        |
| `yaml`                      | ^2.8.2          | **NO**    | only build external                       |
| `zod`                       | ^3.22.4         | yes       | OK                                        |
| `zod-to-json-schema`        | ^3.24.6         | yes       | OK                                        |

**14 production deps to remove**: `@anthropic-ai/sdk`, `@smithery/sdk`, `@valibot/to-json-schema`, `@xmldom/xmldom`, `chalk`, `minimatch`, `node-fetch`, `node-record-lpcm16`, `openai`, `sury`, `valibot`, `yaml`, `typescript` (move to devDeps), and possibly `better-sqlite3` (verify).

### Dev Dependencies (22 total)

| Dep                                | Version  | Used?            | Notes                                       |
| ---------------------------------- | -------- | ---------------- | ------------------------------------------- |
| `@jest/globals`                    | ^29.7.0  | yes (some tests) | Should remove if migrating to bun:test only |
| `@smithery/cli`                    | ^1.6.3   | yes              | OK                                          |
| `@types/bun`                       | latest   | yes              | OK                                          |
| `@types/cors`                      | ^2.8.17  | type-only        | OK                                          |
| `@types/express`                   | ^5.0.0   | type-only        | **MISMATCH: express is v4**                 |
| `@types/jest`                      | ^29.5.14 | type-only        | OK                                          |
| `@types/supertest`                 | ^6.0.2   | type-only        | OK                                          |
| `@types/uuid`                      | ^10.0.0  | type-only        | **should be in dependencies (used in src)** |
| `@typescript-eslint/eslint-plugin` | ^7.1.0   | yes              | outdated — v8 is current                    |
| `@typescript-eslint/parser`        | ^7.1.0   | yes              | outdated                                    |
| `ajv`                              | ^8.17.1  | **NO**           | never imported                              |
| `bun-types`                        | ^1.2.2   | yes              | OK                                          |
| `effect`                           | ^3.19.0  | **NO**           | never imported                              |
| `esbuild`                          | ^0.20.2  | yes              | OK                                          |
| `eslint`                           | ^8.57.0  | yes              | outdated — v9 is current                    |
| `eslint-config-prettier`           | ^9.1.0   | yes              | OK                                          |
| `eslint-plugin-prettier`           | ^5.1.3   | yes              | OK                                          |
| `husky`                            | ^9.0.11  | yes              | OK (but broken by no-op `prepare`)          |
| `prettier`                         | ^3.2.5   | yes              | OK                                          |
| `supertest`                        | ^7.1.0   | yes              | OK                                          |
| `tsx`                              | ^4.7.0   | yes              | OK                                          |
| `uuid`                             | ^11.1.0  | yes              | **should be in dependencies**               |

**2 devDeps to remove**: `ajv`, `effect`
**2 to move to dependencies**: `uuid`, `@types/uuid`
**2 outdated**: eslint v8, @typescript-eslint v7

### Outdated Dependencies (recommend bumping)

- `typescript` ^5.3.3 → 5.7+
- `eslint` ^8.57.0 → 9.x
- `@typescript-eslint/*` ^7.1.0 → 8.x
- `express-rate-limit` ^7.5.0 → 8.x
- `@types/express` ^5.0.0 → ^4.17.x (to match express v4)

---

## Entry Points (Three Primary, as Stated in AGENTS.md)

| File                  | Purpose                                   | Build Target            | Used? |
| --------------------- | ----------------------------------------- | ----------------------- | ----- |
| `src/index.ts`        | HTTP+WS dual transport (custom MCPServer) | `dist/index.cjs`        | YES   |
| `src/stdio-server.ts` | STDIO (FastMCP v3.22)                     | `dist/stdio-server.mjs` | YES   |
| `src/http-server.ts`  | HTTP-only (FastMCP v3.22 + httpStream)    | `dist/http-server.mjs`  | YES   |

### Orphan Entry Points (NOT in any build script)

| File                      | Status                                                 | Lines |
| ------------------------- | ------------------------------------------------------ | ----- |
| `src/http-server-new.ts`  | DEAD — broken (returns 501 on `/mcp`)                  | 203   |
| `src/http-simple.ts`      | DEAD — used only by `Dockerfile.smithery`              | 270   |
| `src/stdio-only.ts`       | DEAD — 41-line minimal, never referenced               | 41    |
| `src/smithery.ts`         | DEAD — FastMCP-based, never built                      | 228   |
| `src/smithery-minimal.ts` | DEAD — listed as `package.json#module` but never built | 187   |
| `src/smithery-sdk.ts`     | **CANONICAL** — used by `smithery:build`               | 152   |
| `src/smithery-entry.ts`   | DEAD — never referenced                                | 268   |

**Total dead entry-point code**: ~1,200 lines

---

## Scripts Breakdown (`package.json`)

### Production Scripts

- `start` → `node dist/index.cjs` ✓
- `start:stdio` → `node dist/stdio-server.mjs` ✓
- `start:http` → `node dist/http-server.mjs` ✓

### Build Scripts

- `build` → esbuild src/index.ts → dist/index.cjs
- `build:node` → **100% IDENTICAL to `build`** (H3 cleanup)
- `build:stdio` → esbuild src/stdio-server.ts → dist/stdio-server.mjs
- `build:http` → esbuild src/http-server.ts → dist/http-server.mjs
- `build:http-simple` → DEAD (http-simple.ts is dead)
- `build:all` → `npm run build:node && build:stdio && build:http` (**should use `bun run`**)
- `smithery:build` → uses npx @smithery/cli (works)
- `smithery:dev`, `smithery:playground` → work
- `prepare` → `echo 'Skipping prepare' || true` (H14 — breaks husky)

### Dev / Watch

- `dev` → `tsx --watch src/index.ts` (works)
- `profile` → `bun --inspect src/index.ts` (works)

### Test

- `test` → `bun test --preload ./test/setup.ts` (works)
- `test:watch`, `test:coverage`, `test:ci`, `test:update`, `test:clear`, `test:staged` (all work)
- `test:e2e` → `bun test test/e2e` (DEAD — automation.test.ts not matched)

### Quality

- `lint` → `eslint . --ext .ts --cache`
- `format` → `prettier --write "src/**/*.ts" --cache`
- `typecheck` → `bun x tsc --noEmit`
- `clean` → `rm -rf dist .bun coverage .eslintcache .prettierignore` (missing `dist-ts/`, `bin/*.js`)

### Docker

- `docker:build`, `docker:up`, `docker:down`, `docker:dev`, `docker:logs` (all use `docker-compose` v1 syntax — should be `docker compose` v2)

### MCP Aliases (Redundant)

- `stdio` → `bun run ./bin/stdio-server.js` (DEAD)
- `mcp:stdio` → DUPLICATE of `stdio`
- `mcp:build` → DUPLICATE of `build:all`

---

## Other Observations

1. **Dual lockfiles**: `bun.lock` (195KB) + `package-lock.json` (432KB) — drift risk
2. **Type/impl mismatch**: `@types/express` ^5.0.0 with `express` ^4.21.2
3. **Privacy leak**: `docker-compose.yml` hardcodes personal IP
4. **4 tsconfig files**: most likely only `tsconfig.json` is used
5. **5 env files**: some are duplicates
6. **Many unused entry points**: 7 dead entry files
7. **Mixed testing styles**: `bun:test` AND `jest` namespace in tests
8. **README claims 34 tools**, but `src/tools/index.ts` lists 31 (drift)
9. **AGENTS.md mentions Valibot**, but code uses **Zod** (drift)
10. **30+ root-level markdown files** — many probably stale
