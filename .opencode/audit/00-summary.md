# Project Audit Summary: advanced-homeassistant-mcp

**Date**: 2026-06-10
**Scope**: Full project audit — install flow, Docker, npm/build, code quality, bugs, dead code, optimization
**Method**: 4 parallel read-only subagent audits + manual verification of critical findings

---

## Subagent Reports

| #   | Report                              | File                                                                 |
| --- | ----------------------------------- | -------------------------------------------------------------------- |
| 1   | Project structure & config overview | [`01-structure-and-config.md`](./01-structure-and-config.md)         |
| 2   | Install flow & Docker audit         | [`02-install-and-docker.md`](./02-install-and-docker.md)             |
| 3   | Bugs, failures, code-quality        | [`03-bugs-and-failures.md`](./03-bugs-and-failures.md)               |
| 4   | Optimization & cleanup              | [`04-optimization-and-cleanup.md`](./04-optimization-and-cleanup.md) |

---

## Critical Issues (MUST fix — image is un-runnable, secret leaked)

| ID      | Issue                                                                                                                                           | File                                            | Severity |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------- |
| **C1**  | `Dockerfile` CMD runs `dist/http-server.js` but build emits `dist/http-server.mjs` — **image crashes on start**                                 | `Dockerfile:104`, `package.json:45`             | CRITICAL |
| **C2**  | Healthcheck path is fine, but server never starts (C1) — healthcheck loops fail                                                                 | `Dockerfile:95`                                 | CRITICAL |
| **C3**  | **JWT token committed in `.env`** (`HASS_TOKEN=eyJhbGciOiJ...`) — must be revoked and removed from git history                                  | `.env:12`                                       | CRITICAL |
| **C4**  | `docker-compose.dev.yml` uses `npm` inside Bun-built image — **broken**                                                                         | `docker-compose.dev.yml:29`                     | CRITICAL |
| **C5**  | `docker-compose.speech.yml` references `homeassistant-mcp:latest` but CI pushes to `jangoblockchained/homeassistant-mcp` — **wrong image name** | `docker-compose.speech.yml:5`                   | HIGH     |
| **C6**  | `Dockerfile.smithery` installs full devDependencies + uses `npm ci` while `bun.lock` is canonical                                               | `Dockerfile.smithery:11`                        | HIGH     |
| **C7**  | `Dockerfile.smithery` runs as **root** (no `USER` directive)                                                                                    | `Dockerfile.smithery`                           | HIGH     |
| **C8**  | `package.json#main` points to `dist/index.js` but no script produces it (only `dist/index.cjs` exists)                                          | `package.json:32`                               | HIGH     |
| **C9**  | WebSocket `authHandler` listener leak — non-JSON messages during auth leave handler attached for socket lifetime                                | `src/hass/websocket-client.ts:106-116`          | CRITICAL |
| **C10** | WebSocket `send()` timeout has no `clearTimeout` — 30s timer leak per request                                                                   | `src/hass/websocket-client.ts:127-137`          | CRITICAL |
| **C11** | Hardcoded weak `JWT_SECRET` defaults in 3 config files — production token forgery risk                                                          | `src/config/*.ts` (3 files)                     | CRITICAL |
| **C12** | Two divergent config systems (`src/config.ts` vs `src/config/app.config.ts`) — many properties silently return `undefined`                      | `src/config.ts`, `src/config/app.config.ts`     | CRITICAL |
| **C13** | `stdio.transport.ts` JSON parser is not newline-safe, no max-buffer — DoS vector                                                                | `src/mcp/transports/stdio.transport.ts:144-208` | CRITICAL |
| **C14** | `docker-compose.yml` hardcodes personal IP `http://192.168.178.63:8123` — privacy leak                                                          | `docker-compose.yml`                            | HIGH     |

---

## High-Impact Issues (cleanup, debt)

| ID  | Issue                                                                                                                              | Impact                                     | Files Affected                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------- |
| H1  | 14+ unused production dependencies (sury, valibot, minimatch, node-fetch, etc.)                                                    | 30%+ smaller package-lock, faster installs | `package.json`                    |
| H2  | 4 duplicate Smithery entry points (`smithery.ts`, `smithery-sdk.ts`, `smithery-minimal.ts`, `smithery-entry.ts`)                   | 800+ lines of dead code                    | `src/smithery*.ts`                |
| H3  | 4-5 dead HTTP server variants (`http-server-new.ts`, `http-simple.ts`, `stdio-only.ts`)                                            | 500+ lines of dead code                    | `src/*.ts`                        |
| H4  | 4 different config files with conflicting naming conventions                                                                       | Confusing, bug-prone                       | `src/config*`                     |
| H5  | esbuild scripts missing `--minify --sourcemap` — 2-3x larger bundles                                                               | 2-3x bundle size reduction possible        | `package.json:42-46`              |
| H6  | 2.2MB `bin/stdio-server.js` build artifact committed; not used                                                                     | 2.2MB repo bloat                           | `bin/stdio-server.js`             |
| H7  | `commands.ts` (27 lines) — all exports unused                                                                                      | 27 lines                                   | `src/commands.ts`                 |
| H8  | `schemas.ts` (285 lines) — 29/30 schemas unused                                                                                    | 285 lines                                  | `src/schemas.ts`                  |
| H9  | `bin/`, `dist-ts/`, `dist/` not fully gitignored — stale build artifacts in repo                                                   | ~6MB repo bloat                            | `.gitignore`, `dist/`, `dist-ts/` |
| H10 | `dist-ts/`, `bin/*.js` artifacts, `start.sh`, `stdio-start.sh` (hardcoded personal path)                                           | dead code                                  | multiple                          |
| H11 | `BaseTool.validateParams` throws non-Error object — `instanceof Error` catches return `"[object Object]"`                          | API error contract broken                  | `src/mcp/BaseTool.ts:107-140`     |
| H12 | `MCPServer` singleton has no reset hook; `shutdown()` doesn't clear `static instance` — zombie state on retry                      | test leakage + prod bug                    | `src/mcp/MCPServer.ts:580-598`    |
| H13 | `MCPResponse.id` returns `undefined` for notifications instead of `null` (JSON-RPC 2.0 violation)                                  | spec violation                             | `src/mcp/MCPServer.ts` (9 sites)  |
| H14 | `SSE Manager` `setInterval`s never cleared, no shutdown method — prevents process exit                                             | memory + lifecycle bug                     | `src/sse/index.ts:79-111`         |
| H15 | Hardcoded version strings in 40+ files (`"1.0.0"`, `"1.2.1"`, `"1.2.3"`) — real version is `1.4.0`                                 | misleading telemetry                       | many                              |
| H16 | 220+ `.js` import extensions + 8 `.ts` extensions — violates AGENTS.md                                                             | consistency                                | `src/**/*.ts`                     |
| H17 | 13 `console.log/error/warn` violations (should use winston logger)                                                                 | violates AGENTS.md                         | 5 files                           |
| H18 | `compile target CommonJS` but `package.json:31 type:module` — confusing tsconfig                                                   | minor                                      | `tsconfig.json:4`                 |
| H19 | `Dockerfile.smithery` `--external` list missing `dotenv`, `express-rate-limit` — runtime import failure                            | runtime crash                              | `Dockerfile.smithery:20`          |
| H20 | `smithery-sdk.ts` `configSchema` uses SCREAMING_SNAKE_CASE keys but `src/index.ts` uses camelCase — describe different MCP servers | runtime mismatch                           | `src/smithery-sdk.ts:15-28`       |

---

## Medium-Impact Issues

| ID  | Issue                                                                                                                                  | Count              | Files                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------- | --- | ----------------- |
| M1  | `dist-ts/`, `tsconfig.docker.json`, `tsconfig.stdio.json`, `tsconfig.test.json` — unused                                               | 4                  | various                                                                       |
| M2  | Duplicate `ToolAnnotations` interface in 4 files                                                                                       | 4                  | `src/types/`, `src/stdio-server.ts`, `src/smithery*.ts`, `src/http-server.ts` |
| M3  | `CommandParams` interface duplicated with different shape                                                                              | 2                  | `src/types/index.ts:41`, `src/interfaces/index.ts:12`                         |
| M4  | `__tests__/schemas/devices.test.js` — dead (`.js` not matched by bunfig.toml)                                                          | 185 lines          | `__tests__/schemas/`                                                          |
| M5  | `test/e2e/automation.test.ts` — dead (not matched by bunfig.toml testPathIgnorePatterns)                                               | 176 lines          | `test/e2e/`                                                                   |
| M6  | `__tests__/tools/tool-registry.test.ts.disabled` — disabled, references nonexistent class                                              | 205 lines          | `__tests__/tools/`                                                            |
| M7  | `litemcp` vestigial: `src/mcp/litemcp.ts` (49 lines), `src/__mocks__/litemcp.ts` (61 lines), `__tests__/types/litemcp.d.ts` (19 lines) | 3 files, 129 lines | `src/mcp/`, `__mocks__/`, `__tests__/types/`                                  |
| M8  | `src/platforms/macos/integration.ts` — unused                                                                                          | 1                  | `src/platforms/`                                                              |
| M9  | `src/websocket/client.ts` — replaced by `src/hass/websocket-client.ts`                                                                 | 1                  | `src/websocket/`                                                              |
| M10 | `scripts/release.sh` and `scripts/deploy-github-pages.sh` hardcode `1.2.1` / `1.2.0`                                                   | 2                  | `scripts/`                                                                    |
| M11 | `scripts/fix-env.js`, `scripts/optimize-dist.js` — unreferenced                                                                        | 2                  | `scripts/`                                                                    |
| M12 | `npm` scripts in `build:all` chain — should be `bun run` for consistency                                                               | 1                  | `package.json:47`                                                             |
| M13 | `AGENTS.md` drift (claims 3 entry points, lists 7+; says Valibot, code uses Zod)                                                       | multiple           | `AGENTS.md`                                                                   |
| M14 | `prepare` script is no-op `echo 'Skipping prepare'                                                                                     |                    | true` — breaks husky post-install                                             | 1   | `package.json:48` |
| M15 | `tsconfig.json:4` `module: CommonJS` inconsistent with `"type": "module"`                                                              | 1                  | `tsconfig.json`                                                               |
| M16 | `docker-compose.yml` env_file + environment both set HASS_HOST/TOKEN (env_file shadowed)                                               | 1                  | `docker-compose.yml`                                                          |
| M17 | `docker-compose.speech.yml` uses `privileged: true` and `network_mode: host` on wake-word                                              | security           | `docker-compose.speech.yml`                                                   |
| M18 | `Dockerfile` installs `pulseaudio`, `alsa-utils` in default image (no audio path in CMD)                                               | bloat              | `Dockerfile:46-52`                                                            |
| M19 | `Dockerfile:24` installs `numpy scipy` (200MB) — not used in CMD                                                                       | bloat              | `Dockerfile:24`                                                               |
| M20 | `models/` dir (3.4MB cached HuggingFace models) should be gitignored                                                                   | 1                  | `.gitignore`                                                                  |
| M21 | `Dockerfile.smithery` HEALTHCHECK uses inline `node -e` — fragile                                                                      | 1                  | `Dockerfile.smithery:27`                                                      |
| M22 | Magic numbers in SSE module duplicate `app.config.ts` values                                                                           | 3                  | `src/sse/index.ts`, `src/http-server.ts`                                      |
| M23 | `security/index.ts:84` `try { checkRateLimit; next(); } catch` — `next()` in try-block mis-classifies errors                           | 1                  | `src/security/index.ts:84`                                                    |
| M24 | `security/index.ts:192-206` `sanitizeValue` runs `escapeHtml` on all string values (corrupts tool input)                               | 1                  | `src/security/index.ts`                                                       |
| M25 | `http-server-new.ts:24` `express.json()` with no body-size limit — DoS                                                                 | 1                  | `src/http-server-new.ts`                                                      |
| M26 | `http-server-new.ts:160` logs `JSON.stringify(request)` (may include token)                                                            | 1                  | `src/http-server-new.ts:160`                                                  |

---

## Low-Impact Issues (style, micro)

- 38 LOW issues documented in `03-bugs-and-failures.md` (issues #60-#100)
- Covers: fake-async patterns, type pollution, magic strings, CORS over-permission, etc.

---

## Top 25 Atomic Cleanup Tasks (recommended execution order)

These are the **actions** derived from the audit, ordered for safe execution:

### Phase 1: Critical (security + broken install) — execute first

1. **Revoke and remove committed JWT from `.env`** (and any git history)
2. **Fix `Dockerfile:104` CMD** to point to `dist/http-server.mjs`
3. **Fix `package.json#main`** to `dist/index.cjs` (and add `build:node` alias for `build`)
4. **Fix `docker-compose.dev.yml`** to use `bun` instead of `npm`
5. **Fix `docker-compose.speech.yml`** image name → `jangoblockchained/homeassistant-mcp`
6. **Fix `Dockerfile.smithery`**: add `USER bunjs`, use `bun install`, drop devDeps
7. **Fix `docker-compose.yml`** to drop hardcoded personal IP

### Phase 2: Dead code removal (no behavior change)

8. **Delete 14 dead source files** (`commands.ts`, `polyfills.js`, `stdio-only.ts`, `http-server-new.ts`, `smithery.ts`, `smithery-minimal.ts`, `smithery-entry.ts`, `mcp/litemcp.ts`, `websocket/client.ts`, `platforms/macos/`, `utils/stdio-transport.ts`, `utils/helpers.ts`, `interfaces/index.ts`, `config.js`)
9. **Delete 4 dead test files** (`__tests__/schemas/devices.test.js`, `test/e2e/automation.test.ts`, `__tests__/tools/tool-registry.test.ts.disabled`, `__tests__/core/server.test.ts`)
10. **Delete dead `bin/` artifacts** (`bin/stdio-server.js`, `bin/mcp-stdio.js`, `bin/test-stdio.js`)
11. **Delete dead `scripts/` files** (`scripts/fix-env.js`, `scripts/optimize-dist.js`, `scripts/release.sh`, `scripts/deploy-github-pages.sh`)
12. **Delete stale `dist-ts/` and ensure `dist/` is gitignored**
13. **Delete `start.sh` and `stdio-start.sh`** (or template the path)

### Phase 3: Dependency cleanup

14. **Remove 14 unused production deps** (sury, valibot, @valibot/to-json-schema, @xmldom/xmldom, chalk, minimatch, node-fetch, node-record-lpcm16, openai, yaml, @anthropic-ai/sdk, @smithery/sdk if not used)
15. **Remove 2 unused devDeps** (ajv, effect)
16. **Move `typescript` to devDependencies** (it's there twice — once in prod, once implied)
17. **Move `uuid` / `@types/uuid` to dependencies** (they're imported in src)
18. **Update `package.json` `module` field** away from dead `src/smithery-minimal.ts`
19. **Fix `package.json` `prepare` script** to actually run husky
20. **Clean up esbuild `--external` list** to remove unused entries

### Phase 4: Build/CI optimization

21. **Add `--minify --sourcemap=inline`** to all 5 esbuild build scripts
22. **Pin/choose one lockfile** (`bun.lock` is canonical, drop `package-lock.json`)
23. **Fix `tsconfig.json:4` module** to `ESNext` (matches `type:module`)
24. **Update AGENTS.md** to match reality
25. **Update all hardcoded version strings** to single `VERSION` constant

### Phase 5: Bug fixes (separate subtask, requires care)

26. Fix WebSocket listener leak (`src/hass/websocket-client.ts:106-116`)
27. Fix WebSocket timeout leak (`src/hass/websocket-client.ts:127-137`)
28. Remove JWT secret defaults, throw on missing
29. Consolidate config files (delete `config.js` + `config/index.ts`, standardize on `app.config.ts`)
30. Fix `BaseTool.validateParams` to throw `Error` subclasses
31. Add `MCPServer.resetInstance()` and call from `shutdown()`
32. Fix `MCPResponse.id` to use `null` for notifications
33. Fix `SSE Manager` shutdown: store intervals, clear on shutdown
34. Add `SSE` Manager `writableEnded` check before send
35. Fix `stdio.transport.ts` to use `readline` (or split2) with 1MB buffer cap
36. Fix `routes/sse.routes.ts` `res.write` after `res.end()` race
37. Remove 13 `console.*` calls in favor of winston logger
38. Drop 8 `.ts` import extensions (AGENTS.md compliance)
39. Fix `security/index.ts:84` `next()` outside try-block
40. Move `sanitize-html` to output rendering, not input

---

## Files Audited (per subagent)

### Report 1 (structure)

- `package.json`, `tsconfig.json`, `bunfig.toml`, `.env.example`, `.gitignore`, `README.md`
- `Dockerfile`, `Dockerfile.smithery`, `docker-compose*.yml`, `.dockerignore`
- `smithery.yaml`, `smithery.config.js`
- `src/` (137 .ts files, ~25,471 lines), `__tests__/` (40 files, ~9,212 lines)

### Report 2 (install/docker)

- `Dockerfile`, `Dockerfile.smithery`, `docker-compose*.yml`, `.dockerignore`
- `.github/workflows/*.yml` (4 workflows)
- `package.json`, `bunfig.toml`, `tsconfig*.json`
- `bin/`, `scripts/`, `start.sh`, `stdio-start.sh`
- `smithery.yaml`, `smithery.config.js`

### Report 3 (bugs)

- All of `src/**` and `__tests__/**`
- `bin/`, `scripts/`

### Report 4 (optimization)

- All of `src/**` and `__tests__/**`
- `bin/`, `dist/`, `dist-ts/`

---

## Stats

| Metric                              | Value                                                                |
| ----------------------------------- | -------------------------------------------------------------------- |
| Total issues identified             | 138 (7 CRITICAL, 23 HIGH, 32 MEDIUM, 38 LOW, 38 cleanup)             |
| Dead code to remove                 | ~3,500+ lines                                                        |
| Build artifacts to remove           | ~6MB (`dist/`, `dist-ts/`, `bin/stdio-server.js`)                    |
| Unused dependencies to remove       | 14 prod + 2 dev                                                      |
| Bundle size reduction (with minify) | 2-3x                                                                 |
| Files affected                      | 60+ across `src/`, `__tests__/`, `bin/`, `scripts/`, configs, Docker |
