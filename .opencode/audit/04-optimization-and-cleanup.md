# Report 4: Optimization & Cleanup Opportunities

**Subagent**: `explore` (ses_14f8d285dffem6FESpp0WZEq3g)
**Date**: 2026-06-10
**Method**: Read-only inspection of source, tests, build output, and package metadata.

---

## CRITICAL Optimization Issues

### 1. esbuild build script has NO minify, NO sourcemap, NO tree-shaking flags

- **File**: `package.json` (lines 42-46)
- **Issue**: All 5 `build:*` scripts run esbuild with `--bundle --external:*` but lack `--minify --sourcemap` or `--tree-shaking`
- Current build output is **2.9MB** (`dist/index.cjs`) for CJS target
- `bunfig.toml` has minify enabled but only used by `bun build`, not `npm run build` (AGENTS.md instructs to use this)
- **Fix**: Add `--minify --sourcemap=inline` to all 5 esbuild scripts
- **Impact**: 2-3x reduction in bundle size; also fix `build:node` (currently identical to `build`, so `build:all` builds `index.cjs` twice)

### 2. Dead entry points / build artifacts

- `bin/stdio-server.js` (2.2MB, 157 lines) — minified build artifact checked into repo
  - Not in `files` field of `package.json` (line 141-146)
  - Never run by any npm script
- `bin/mcp-stdio.js` — replaced by `mcp-stdio.cjs`
- `bin/test-stdio.js` — not referenced anywhere
- **Fix**: Delete `bin/stdio-server.js`, `bin/mcp-stdio.js`, `bin/test-stdio.js`. Update `.gitignore` to exclude `bin/*.js` build artifacts
- **Impact**: 2.2MB reduction in repo size

### 3. Vestigial Smithery entry points (4 duplicates)

| File                      | Lines | Status                                   |
| ------------------------- | ----- | ---------------------------------------- |
| `src/smithery.ts`         | 228   | DEAD — uses `fastmcp`                    |
| `src/smithery-sdk.ts`     | 152   | **CANONICAL** — used by `smithery:build` |
| `src/smithery-minimal.ts` | 187   | DEAD — uses `@modelcontextprotocol/sdk`  |
| `src/smithery-entry.ts`   | 268   | DEAD — uses `@modelcontextprotocol/sdk`  |

- All four declare `configSchema`, `createServer`, `formatToolTitle`, `getToolAnnotations`, `zodSchemaToJson` with near-identical logic
- **Fix**: Delete 3 duplicates. `http-server-new.ts` (203 lines) and `http-simple.ts` (270 lines) similarly redundant
- **Impact**: 800+ lines of duplicated code removed

### 4. Three different config import patterns

| File                           | Lines | Status                                                   |
| ------------------------------ | ----- | -------------------------------------------------------- |
| `src/config.js`                | 32    | DEAD — legacy re-export shim with UPPER_CASE aliases     |
| `src/config/index.ts`          | 85    | Second-generation — only 1 user                          |
| `src/config/app.config.ts`     | 152   | Third-generation Zod-validated — 5 users                 |
| `src/schemas/config.schema.ts` | 81    | Fourth Zod schema — used by `src/config.ts:7` and 1 test |

- **Four config files, two default configs, three naming conventions**
- **Fix**: Delete `src/config.js` and `src/config/index.ts`. Standardize on `src/config/app.config.ts`
- **Impact**: 117+ lines removed; eliminates naming split

### 5. Unused dependencies in `package.json` (16 packages)

**Production dependencies with NO usage**:
| Dep | Reason |
|-----|--------|
| `@anthropic-ai/sdk` | in esbuild `--external` but never imported |
| `@smithery/sdk` | listed but never imported |
| `chalk` | never imported |
| `minimatch` | never imported |
| `node-fetch` | never imported (Node 18+ has native fetch) |
| `node-record-lpcm16` | only d.ts declaration, never used |
| `openai` | never imported |
| `sury` | never imported (alpha!) |
| `@xmldom/xmldom` | never imported |
| `@valibot/to-json-schema` | never imported (and `valibot` isn't either) |
| `valibot` | never imported (AGENTS.md says use it; code uses zod) |
| `yaml` | never imported |

**DevDependencies unused or misplaced**:
| Dep | Issue |
|-----|-------|
| `ajv` | never imported |
| `effect` | never imported |
| `uuid` / `@types/uuid` | **imported in src** — should be in dependencies |

**Note**: esbuild's `--external` lists `node-fetch`, `sury`, `chalk`, `@xmldom/xmldom` etc. — but these aren't even in `node_modules` because nothing imports them.

**Fix**: Remove all 12 unused production dependencies. Move `uuid`/`@types/uuid` to `dependencies`. Clean up esbuild `--external` list.

**Impact**: Faster `npm install`, smaller `node_modules`, smaller `package-lock.json` (432KB → ~50KB)

---

## HIGH Impact Issues

### 6. `commands.ts` exports are completely unused (27 lines)

- Exports `commonCommands`, `coverCommands`, `climateCommands`, `CommonCommand`, `CoverCommand`, `ClimateCommand`, `Command`
- **None imported anywhere**
- **Fix**: Delete the file

### 7. `schemas.ts` is mostly dead (285 lines)

- 30+ Zod schemas; only `DomainSchema` is used in production code
- 28 schemas referenced only in **dead** `__tests__/schemas/devices.test.js`
- **Fix**: Delete the file and move `DomainSchema` to `src/tools/control.tool.ts`

### 8. `formatToolCall` in `helpers.ts` only used by its own test

- `src/utils/helpers.ts` (12 lines) — only export is `formatToolCall`
- **Only import is `__tests__/helpers.test.ts`**
- **Fix**: Delete both files

### 9. `polyfills.js` is dead (9 lines)

- Never imported anywhere
- **Fix**: Delete

### 10. `stdio-only.ts` and `http-server-new.ts` are dead entry points

- 41 + 203 = 244 lines
- **Fix**: Delete both. Consolidate HTTP server logic into `src/http-server.ts`

### 11. Test file `__tests__/schemas/devices.test.js` is dead (185 lines)

- `bunfig.toml:11` `testMatch = ["**/__tests__/**/*.test.ts"]` — `.test.js` not matched
- **Fix**: Delete the `.js` file

### 12. `test/e2e/automation.test.ts` is dead (176 lines)

- Lives in `test/e2e/`, excluded by bunfig
- **Fix**: Move to `__tests__/e2e/` if needed, or delete

### 13. `tool-registry.test.ts.disabled` is dead (205 lines)

- `.disabled` extension means bun never runs it
- References nonexistent `ToolRegistry` class
- **Fix**: Delete

---

## MEDIUM Impact Issues

### 14. Inconsistent import style — 220 `.js` extensions violate AGENTS.md

- 220+ `.js` extensions across `src/`
- Only 1 file uses `@/` path alias
- **Fix**: Codemod + ESLint rule (huge refactor, 220+ files)

### 15. 8 files use `.ts` extension in imports

- Direct violation of AGENTS.md
- **Fix**: Drop `.ts` from these 8 imports (quick win)

### 16. `console.*` violations (13 calls across 5 files)

- `src/config/loadEnv.ts` (6)
- `src/config/app.config.ts:116`
- `src/stdio-only.ts:33` (file is also dead)
- `src/tools/subscribe-events.tool.ts` (3)
- `src/routes/sse.routes.ts` (3)
- **Fix**: Replace with `logger.warn`/`logger.info`/`logger.error`

### 17. `dist-ts/` directory is stale

- Old tsc output, not used by esbuild
- **Fix**: Delete `dist-ts/` and add to `.gitignore`

### 18. Duplicate `ToolAnnotations` interface in 4 files

- `src/types/index.ts:7` (canonical)
- `src/stdio-server.ts:45`, `src/smithery.ts:46`, `src/smithery-entry.ts:40`, `src/http-server.ts:33` (private)
- **Fix**: Import from `@/types` (after path alias setup)

### 19. Duplicate `CommandParams` interface

- `src/types/index.ts:41` (canonical) vs `src/interfaces/index.ts:12` (different shape)
- **Fix**: Delete `src/interfaces/index.ts`

### 20. Vestigial `litemcp` references (3 files, 157 lines)

- `src/__mocks__/litemcp.ts` (61 lines)
- `src/__mocks__/@digital-alchemy/hass.ts` (77 lines)
- `__tests__/types/litemcp.d.ts` (19 lines)
- **Fix**: Delete all 3

### 21. Hardcoded version strings in 40+ files

- `1.0.0`, `1.2.1`, `1.2.3` scattered across 40+ files
- Real version is `1.4.0` (in `package.json`)
- **Fix**: Single `VERSION` constant imported from `package.json` (or build-time replace)

### 22. Hardcoded fallback values should reference `APP_CONFIG`

- `src/health-check.ts:5` - `"http://localhost:3000/health"`
- `src/openapi.ts:33` - `"http://localhost:3000"`
- `src/config/index.ts:42,49-51` - duplicated `http://localhost:8123`
- **Fix**: Use `APP_CONFIG` values

### 23. Test files with weak/no real assertions

- `__tests__/server.test.ts` - `expect(true).toBe(true)` smoke tests
- `__tests__/context/context.test.ts` (88 lines) - 1 test, mocks `get_hass` but doesn't call
- `__tests__/core/server.test.ts` (33 lines) - admits vestigial
- `__tests__/hass/index.test.ts` (48 lines) - 2 tests
- **Fix**: Delete or rewrite to do real testing

### 24. Inconsistent config import in middleware

- 3 different config patterns in 1 directory:
  - `src/middleware/index.ts:2` - old config
  - `src/middleware/index.ts:7` - new config
  - `src/middleware/rate-limit.middleware.ts:2` - legacy shim
  - `src/middleware/logging.middleware.ts:12` - newest
- **Fix**: Standardize on `../config/app.config.js`

### 25. `stdio-start.sh` has hardcoded personal path

- Line 21: `WORKSPACE_ROOT="/home/jango/Git/homeassistant-mcp"`
- Not referenced in any script
- **Fix**: Delete or template

### 26. AGENTS.md drift

- Says "Three entry points" but 7+
- Says "Valibot" but code uses Zod
- Says "NO `.js` extensions" with 220 violations
- **Fix**: Update AGENTS.md to reflect reality

---

## LOWER Impact Issues

### 27. `scripts/fix-env.js` and `scripts/optimize-dist.js` are dead (62 lines)

- Not referenced by any npm script
- **Fix**: Delete or wire into `build:all`

### 28. `bin/stdio-server.js` is 2.2MB (duplicate of #2)

- Add `bin/*.js` to `.gitignore`

### 29. Magic numbers in SSE module

- `src/sse/index.ts:8-9` `DEFAULT_PING_INTERVAL = 30000`, `DEFAULT_CLEANUP_INTERVAL = 60000`
- Duplicates `app.config.ts:59,70` values
- Same `30000` in `http-server.ts:83`
- **Fix**: Reference `APP_CONFIG.SSE.PING_INTERVAL`

### 30. `models/` directory (3.4MB)

- Cached HuggingFace models
- In `.dockerignore` (good) but should also be in `.gitignore`

---

## SUMMARY TABLE

| #   | Issue                                  | Impact | Lines/MB Saved        |
| --- | -------------------------------------- | ------ | --------------------- |
| 1   | esbuild missing minify/sourcemap       | HIGH   | 2-3x bundle reduction |
| 2   | Dead build artifacts in `bin/`         | HIGH   | 2.2MB                 |
| 3   | 4 duplicate Smithery entry points      | HIGH   | 800+ lines            |
| 4   | 3-4 different config files             | HIGH   | 117+ lines            |
| 5   | 12 unused prod deps + 2 devDeps        | HIGH   | package-lock -90%     |
| 6   | `commands.ts` unused                   | HIGH   | 27 lines              |
| 7   | `schemas.ts` mostly dead               | HIGH   | 285 lines             |
| 8   | `helpers.ts` only tested               | MEDIUM | 78 lines              |
| 9   | `polyfills.js` unused                  | MEDIUM | 9 lines               |
| 10  | `stdio-only.ts` / `http-server-new.ts` | MEDIUM | 244 lines             |
| 11  | `devices.test.js` dead duplicate       | HIGH   | 185 lines             |
| 12  | `test/e2e/` dead                       | MEDIUM | 176 lines             |
| 13  | `tool-registry.test.ts.disabled`       | MEDIUM | 205 lines             |
| 14  | 220 `.js` import extensions            | MEDIUM | —                     |
| 15  | 8 `.ts` import extensions              | MEDIUM | —                     |
| 16  | 13 `console.*` violations              | MEDIUM | —                     |
| 17  | `dist-ts/` stale                       | MEDIUM | —                     |
| 18  | 4x `ToolAnnotations` duplicates        | MEDIUM | —                     |
| 19  | `CommandParams` duplicates             | MEDIUM | 170 lines             |
| 20  | litemcp vestigial                      | MEDIUM | 157 lines             |
| 21  | Hardcoded version strings              | MEDIUM | —                     |
| 22  | Hardcoded localhost URLs               | MEDIUM | —                     |
| 23  | Tests with weak assertions             | MEDIUM | —                     |
| 24  | 3 config patterns in middleware        | MEDIUM | —                     |
| 25  | `stdio-start.sh` personal path         | MEDIUM | —                     |
| 26  | AGENTS.md drift                        | MEDIUM | —                     |
| 27  | Dead utility scripts                   | LOW    | 62 lines              |
| 28  | Magic numbers (SSE intervals)          | LOW    | —                     |
| 29  | `models/` not in gitignore             | LOW    | —                     |

**Total estimated cleanup**: ~3,500+ lines of dead/duplicate code removed, 2.2MB+ of build artifacts cleared, 12 unused packages removed, and a 2-3x bundle size reduction achievable.

---

## Files Audited (absolute paths)

- All `src/**` (137 .ts files, ~25,471 lines)
- All `__tests__/**` (40 files, ~9,212 lines)
- `bin/*`, `dist/`, `dist-ts/`, `scripts/`
- `package.json`, `bunfig.toml`, `tsconfig.json`, `tsconfig*.json`
- `Dockerfile`, `Dockerfile.smithery`, `docker-compose*.yml`
