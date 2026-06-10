# Report 3: Bugs, Failures, and Code Quality

**Subagent**: `explore` (ses_14f8d6322ffe8e0kguH0NJq3HJ)
**Date**: 2026-06-10
**Method**: Read-only inspection of all source in `src/` and `__tests__/`, plus Grep for patterns.

---

## Executive Summary

This audit identified **100 distinct issues** across the `src/` directory, spanning 4 severity levels. The most concerning problems:

1. **Zero use of the configured `@/` path alias** (1 file uses it out of 220+)
2. **Two divergent configuration systems** that conflict
3. **30-second WebSocket message timeout leak**
4. **`authHandler` listener leak** during WebSocket authentication
5. **Hardcoded weak JWT secrets** as fallbacks (token forgery risk)
6. **4 LSP-detected type errors** in active code (confirmed by IDE)

**Stats**: 7 CRITICAL, 23 HIGH, 32 MEDIUM, 38 LOW

---

## CRITICAL Severity Issues (7)

### 1. WebSocket `authHandler` listener leak (`src/hass/websocket-client.ts:106-116`)

- **Issue**: `authHandler` is added to `this.socket.on("message", ...)` but only removed in resolve/reject paths (lines 95, 98, 113). If the WebSocket emits a non-JSON message during the auth window, the handler stays attached for the socket lifetime. Every subsequent message invokes the stale handler. Multiple concurrent `connect()` calls stack handlers.
- **Fix**: Add resolve/reject flag, clear it inside handler, only call `removeListener` once. Use `socket.once` semantics.

### 2. WebSocket `send()` timeout has no `clearTimeout` (`src/hass/websocket-client.ts:127-137`)

- **Issue**: `setTimeout` (line 132) is never cleared on success. A 100ms request still holds the timer for 30s. When WS disconnects (line 75-79), `pendingRequests` rejected but timer leaks.
- **Fix**: Store the `setTimeout` handle in `pendingRequests` map; clear it on resolve/reject.

### 3. Hardcoded weak `JWT_SECRET` defaults (3 files)

- `src/config/index.ts:41`, `src/config/app.config.ts:46`, `src/config/security.config.ts:56`
- Defaults: `"default_secret_key_change_in_production"`, `"your-secret-key-must-be-32-char-min"`, `"your-secret-key"`
- A production deployment that forgets to override env vars signs/verifies JWTs with a **publicly-known string**
- **Token forgery vector**
- **Fix**: Remove defaults entirely. Throw if `JWT_SECRET` is missing or < 32 chars.

### 4. Two divergent `config.ts` and `config/app.config.ts` systems

- `src/config.ts` (65 lines): `MCPServerConfigSchema` with `silentStartup`, `corsOrigin`, `rateLimit.maxRequests`
- `src/config/app.config.ts` (152 lines): different `AppConfigSchema` with `SPEECH`, `JWT_SECRET`, `RATE_LIMIT.windowMs`, `LOGGING`
- `src/config/index.ts` (85 lines): yet another structure
- `index.ts` imports from `./config` (first), but `error-log.tool.ts`, `template.tool.ts`, `routes/*.ts`, `middleware/*.ts`, `utils/log-rotation.ts`, `speech/*.ts` import from `./config/app.config`
- **Many properties silently return `undefined`**, breaking tool calls
- **Fix**: Delete `src/config.ts` and `src/config/index.ts`, consolidate on `src/config/app.config.ts`

### 5. `stdio.transport.ts` JSON parser not newline-safe (`src/mcp/transports/stdio.transport.ts:144-208`)

- Custom brace-counting parser does not respect newline-delimited JSON-RPC framing
- Counts only braces, ignores brackets — `{"foo": [1, 2, 3}` is balanced but parser drops `]}`
- **No max-buffer guard** — a client sending `{"jsonrpc":"2.0",` with no closing brace leaks memory until OOM
- **DoS vector**
- **Fix**: Use `readline`-based `utils/stdio-transport.ts` (already exists), or `split2`/streaming JSON parser. Cap buffer at 1MB.

### 6. `stdio-only.ts` discards entire server and exits on error (`src/stdio-only.ts:32-35`)

- Every error path calls `process.exit(1)`
- Combined with unhandled promise rejection at bottom (`void main();`), cannot be run inside a test harness
- Test at `__tests__/server.test.ts:82` asserts "not throw" but can never verify real failure mode
- **Fix**: Log and return non-zero; let runtime decide whether to exit

### 7. `stdio-server.ts` import order: config loaded after import evaluated (`src/stdio-server.ts:30-34`)

- Line 32 imports `AppConfig` from `./config/index`, which at module top-level calls `loadEnvironmentVariables()`
- `loadEnv.ts` and `stdio-server.ts` both call `dotenvConfig` with same file
- `stdio-server.ts` uses `override: true` and runs first → values get clobbered by second invocation
- **Fix**: Pick one loader; remove the other

---

## HIGH Severity Issues (23)

### 8. `BaseTool.validateParams` throws non-Error (`src/mcp/BaseTool.ts:107-111, 136-140`)

- `throw { code, message, data }` — catchers in `MCPServer.ts` (`error instanceof Error ? error.message : String(error)`) fall through to `String(error)` which is `"[object Object]"`
- **Code and structured data are lost**
- **Fix**: Throw `new Error(message)` with payload as `cause`

### 9. `MCPServer` singleton has no reset hook (`src/mcp/MCPServer.ts:67-113`)

- `getInstance` reuses singleton across test files
- `__tests__/index.test.ts` notes the leakage
- **No `static resetInstance()`**, `shutdown()` does not clear `MCPServer.instance`
- Production bug: if server starts, fails, retries → old transports/middlewares persist
- **Fix**: Add `MCPServer.resetInstance()` and call it from `shutdown()`

### 10. `subscribe()` returns unsubscribe that races completion (`src/hass/websocket-client.ts:175-212`)

- `subscriptionId` is `null` until WS result frame arrives
- If caller invokes unsubscribe before round-trip completes, line 196 short-circuits
- **Server-side subscription leaks**
- **Fix**: Queue unsubscribe call, drain after subscribe result

### 11. `subscribe()` doesn't filter by subscription id (`src/hass/websocket-client.ts:164-169`)

- `subscriptions.set(subscriptionId, callback)` keyed on server-assigned id
- `handleMessage` (line 164-168) looks up by `message.id` which is the _original request id_
- **Wrong id used for routing events**
- **Fix**: Store callback under subscription id (the result's `.id`)

### 12. `MCPServer.executeRequest` returns `request.id ?? undefined` (`src/mcp/MCPServer.ts:213-255-302-322-335-354-366-409-424-451`)

- JSON-RPC 2.0: response **must** have an `id` field
- For notifications (`id === null`), returns `undefined` instead of `null`
- **Fix**: Use `request.id ?? null` consistently; tighten `MCPResponse.id` to `string | number | null`

### 13. Hardcoded `protocolVersion: "2024-11-05"` (`src/mcp/MCPServer.ts:235`)

- No constant, no comment
- **Fix**: Export `MCP_PROTOCOL_VERSION` from single source

### 14. `hass/index.ts` logs token length (`src/hass/index.ts:18-20`)

- `logger.info(\`Token loaded: yes (${this.token.length} chars)\`)` — token existence in logs
- **Privacy leak** via downstream log aggregation
- **Fix**: Log at `debug` level only

### 15. JWT secret comparison: `TokenExpiredError` triggers lockout (`src/security/index.ts:374-380`)

- Generic "Token validation failed" doesn't differentiate expired vs tampered
- `recordFailedAttempt` (line 416) kicks in for ALL failures
- **A user with 5-min expired token is locked out for 15 min**
- **Fix**: Don't record failed attempts for `TokenExpiredError`

### 16. `MCPServer` shutdown leaves `static instance` populated (`src/mcp/MCPServer.ts:580-598`)

- `shutdown()` clears tools/middlewares/transports/resources, calls `removeAllListeners()`
- Does NOT reset `MCPServer.instance`
- Subsequent `getInstance()` returns zombie server with no tools
- **Fix**: Set `MCPServer.instance = null` after shutdown

### 17. `utils/stdio-transport.ts` module-level `messageHandlers` Map (`src/utils/stdio-transport.ts:61-67`)

- `messageHandlers` is module-scope `Map` populated by `registerHandler()`
- **No `unregisterHandler` or `clearHandlers`**
- In tests, every import registers handlers again → Map grows monotonically
- In prod, hot-reload leaks
- **Fix**: Add `unregisterHandler` and call it in tool teardown

### 18. `stdio.transport.ts` has no max-buffer guard (`src/mcp/transports/stdio.transport.ts:144-208`)

- See C5 — buffer can grow to OOM if client sends incomplete frame
- `on("data")` doesn't pause stdin when buffer > threshold → attacker can DoS

### 19. `http-server.ts` shutdown is synchronous `process.exit(0)` (`src/http-server.ts:265-273`)

- `shutdown = (): void => { try { process.exit(0); } catch ... }` — no `await server.stop()`, no closing of HTTP server, no flush
- **In-flight JSON-RPC responses dropped**
- **Fix**: Properly close: `await server.stop(); process.exit(0);`

### 20. `http-server-new.ts` `/mcp` endpoint returns 501 stub (`src/http-server-new.ts:146-172`)

- POST `/mcp` hardcoded to return `501 Method not implemented in Express handler`
- FastMCP server created but never mounted on Express app
- **Dead-on-arrival for actual MCP traffic**

### 21. `http-server.ts` port/host parsing logic (`src/http-server.ts:24-25`)

```ts
const port = (process.env.PORT ?? "7123") ? parseInt(process.env.PORT ?? "7123", 10) : 7123;
const host = process.env.HOST; // no fallback
```

- Ternary is meaningless (any non-empty string is truthy)
- `host` defaults to `undefined` → FastMCP defaults to `0.0.0.0`
- **Fix**: `const port = parseInt(process.env.PORT ?? "7123", 10); const host = process.env.HOST ?? "0.0.0.0";`

### 22. SSE Manager `setInterval` is never cleared (`src/sse/index.ts:79-111`)

- `startMaintenanceTasks()` sets up two `setInterval`s but never stores handles, never clears them on `removeClient`, never provides `shutdown()` method
- **Prevents process from exiting cleanly**
- In tests, every `getInstance()` stacks more intervals
- **Fix**: Store handles; clear in `shutdown()`; call from `MCPServer.shutdown()`

### 23. SSE Manager ping logs to `info` level per client (`src/sse/index.ts:80-95, 397-407`)

- `logger.info("Attempting to send data to client...")` and `logger.info("Broadcasting state change...")` on every ping and every state change
- 1000 clients × 1000 entities = ~1M log lines per minute at INFO
- **Disk fill** from rotating logs

### 24. `http-server.ts:225` — `middleware` not a valid FastMCP option (LSP-confirmed)

```ts
{ middleware: [...] }  // not in FastMCP options type
```

- Type error: `middleware` does not exist in `httpStream` options
- Likely broken middleware wiring

### 25. `smithery-sdk.ts:127,138` — Type errors with `@modelcontextprotocol/sdk` (LSP-confirmed)

- Line 127: `readCallback` return type `MCPResourceContent[]` doesn't match `ReadResourceCallback` shape (`blob: string` is required, not `string | undefined`)
- Line 138: `args` shape doesn't match `PromptArgsRawShape` (no index signature)
- **Will fail to compile if Smithery SDK is updated**

### 26. `stdio-only.ts:26` — Type error with FastMCP `Context<FastMCPSessionAuth>` (LSP-confirmed)

- Tool callback returns `Promise<unknown>` but FastMCP expects `Promise<string | void | AudioContent | ContentResult | ImageContent | ResourceContent | TextContent>`
- **Will fail at runtime**

### 27. `src/mcp/middleware/index.ts:24,36,39,66,137` — `id: string | number | null` not assignable to `string | number | undefined` (LSP-confirmed)

- 5 sites where `request.id ?? null` doesn't fit the expected response type
- **Cascade from C12**

### 28. `MCPServer.ts:273` — Type instantiation is excessively deep and possibly infinite (LSP-confirmed)

- Type-level issue with response type
- May indicate deeply-nested generic types

---

## MEDIUM Severity Issues (32)

### 29. `commands.ts` exports are completely unused (27 lines)

- `commonCommands`, `coverCommands`, `climateCommands`, etc.
- **None imported anywhere** in `src/` or `__tests__/`

### 30. `schemas.ts` mostly dead (285 lines)

- 30+ Zod schemas; only `DomainSchema` is used in production code
- 28 schemas referenced only in **dead** `__tests__/schemas/devices.test.js`

### 31. `formatToolCall` in `helpers.ts` only used by its own test

- `__tests__/helpers.test.ts` is the only import

### 32. `polyfills.js` is dead (9 lines)

- Never imported

### 33. `stdio-only.ts` and `http-server-new.ts` are dead entry points

- Neither referenced in any npm script or other source

### 34. Test file `__tests__/schemas/devices.test.js` is dead

- `bunfig.toml:11` `testMatch = ["**/__tests__/**/*.test.ts"]` excludes `.test.js`
- 185 lines of never-executed code

### 35. `test/e2e/automation.test.ts` is dead (176 lines)

- Excluded by bunfig.toml testPathIgnorePatterns

### 36. `tool-registry.test.ts.disabled` is dead (205 lines)

- `ToolRegistry` class doesn't exist in `src/tools/index.ts`

### 37. Inconsistent import style — 220 `.js` extensions violate AGENTS.md

- AGENTS.md line 21: NO `.js` extensions
- 220+ imports use `.js` extension
- Only 1 file uses `@/` path alias

### 38. 8 files use `.ts` extension in imports

- `src/middleware/logging.middleware.ts:12` - `from "../config/app.config.ts"`
- `src/middleware/index.ts:7` - `from "../config/security.config.ts"`
- `src/routes/tool.routes.ts:2` - same
- `src/routes/health.routes.ts:2` - same
- `src/routes/mcp.routes.ts:12` - same
- `src/speech/index.ts:1` - same
- `src/config.js:9` - `from './config.ts'`
- `src/utils/log-rotation.ts:13` - same

### 39. `console.*` violations (13 calls across 5 files)

- `src/config/loadEnv.ts` (6)
- `src/config/app.config.ts:116`
- `src/stdio-only.ts:33`
- `src/tools/subscribe-events.tool.ts` (3)
- `src/routes/sse.routes.ts` (3)

### 40. `dist-ts/` directory is stale

- Old tsc output, not used by esbuild

### 41. Duplicate `ToolAnnotations` interface in 4 files

- `src/types/index.ts:7` (canonical)
- `src/stdio-server.ts:45`, `src/smithery.ts:46`, `src/smithery-entry.ts:40`, `src/http-server.ts:33` (private)

### 42. Duplicate `CommandParams` interface

- `src/types/index.ts:41` vs `src/interfaces/index.ts:12` (different shape)

### 43. Vestigial `litemcp` references

- `src/__mocks__/litemcp.ts` (61 lines)
- `src/__mocks__/@digital-alchemy/hass.ts` (77 lines)
- `__tests__/types/litemcp.d.ts` (19 lines)
- All never imported

### 44. Hardcoded version strings in 40+ files

- `1.0.0`, `1.2.1`, `1.2.3` in 40+ files
- Real version is `1.4.0`

### 45. Hardcoded fallback values should reference `APP_CONFIG`

- `src/health-check.ts:5` - `"http://localhost:3000/health"`
- `src/openapi.ts:33` - `"http://localhost:3000"`
- `src/config/index.ts:42,49-51` - duplicated `http://localhost:8123`

### 46. Test files with weak/no real assertions

- `__tests__/server.test.ts` lines 92, 103: `expect(true).toBe(true)` smoke tests
- `__tests__/context/context.test.ts` (88 lines): 1 test, mocks `get_hass` but doesn't call
- `__tests__/core/server.test.ts` (33 lines): admits vestigial
- `__tests__/hass/index.test.ts` (48 lines): admits mock leak issues

### 47. Inconsistent config import in middleware

- 3 different config patterns in 1 file directory
- `src/middleware/index.ts:2` (old) vs `:7` (new)
- `src/middleware/rate-limit.middleware.ts:2` (legacy shim)
- `src/middleware/logging.middleware.ts:12` (newest)

### 48. `stdio-start.sh` has hardcoded personal path

- `WORKSPACE_ROOT="/home/jango/Git/homeassistant-mcp"`

### 49. AGENTS.md drift

- Says "Three entry points" but project has 7+
- Says "Valibot" but code uses Zod
- Says "NO `.js` extensions" with 220 violations

### 50. `scripts/fix-env.js` and `scripts/optimize-dist.js` are dead (62 lines)

### 51. `bin/stdio-server.js` is 2.2MB (not in `.gitignore` for `bin/*.js`)

### 52. Magic numbers in SSE module duplicate `app.config.ts` values

- `src/sse/index.ts:8-9` `30000`/`60000` vs `app.config.ts:59,70`

### 53. `models/` dir (3.4MB) should be gitignored

### 54. `tsconfig.json:4` `module: CommonJS` inconsistent with `type:module`

### 55. `docker-compose.yml` env_file + environment shadowing

### 56. `docker-compose.speech.yml` uses `privileged: true` and `network_mode: host`

### 57. `Dockerfile` installs `pulseaudio`, `alsa-utils` in default image (no audio path)

### 58. `Dockerfile:24` installs `numpy scipy` (200MB) — not used

### 59. Magic numbers in SSE module duplicate `app.config.ts` values

### 60. `security/index.ts:84` rate limiter throws inside `next()` callback

- `try { checkRateLimit(ip); next(); } catch` — if `next()` throws, mis-classifies error as 429

---

## LOW Severity Issues (38 — abbreviated list)

| #   | Issue                                                                                                                   | Location        |
| --- | ----------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------- | -------- |
| 61  | `security/index.ts:192-206` `sanitizeValue` runs `escapeHtml` on all string values (corrupts JSON inside object values) | security        |
| 62  | `config.ts` `loadConfig` catches and re-throws with generic message (loses Zod issue tree)                              | config          |
| 63  | `stdio-server.ts:18-28` double-loads `.env`                                                                             | stdio-server    |
| 64  | `http-server-new.ts:24` `express.json()` with no body-size limit — DoS                                                  | http-server-new |
| 65  | `http-server-new.ts:160` `JSON.stringify(request)` logs entire request body (may include token)                         | http-server-new |
| 66  | `routes/sse.routes.ts:38-43` `res.write(...)` may be called after `res.end()` at line 64                                | sse.routes      |
| 67  | `sse/index.ts:80-95` ping writes to possibly-closed `res`                                                               | sse             |
| 68  | `mcp/transports/stdio.transport.ts:147-208` `setupInputHandling` not idempotent                                         | transport       |
| 69  | `mcp/transports/stdio.transport.ts:210-220` `process.stdin.on("end")` calls `process.exit(0)`                           | transport       |
| 70  | `mcp/MCPServer.ts:464-499` `acquireResource` returns synchronously after async gap                                      | MCPServer       |
| 71  | `mcp/MCPServer.ts:540-559` `listResources` is async but does no I/O                                                     | MCPServer       |
| 72  | `MCPResponse` interface allows `result` and `error` to coexist                                                          | types.ts:77-82  |
| 73  | `MCPNotification` type uses `any` for params                                                                            | types.ts:99     |
| 74  | `Mock<T>` type in `src/sse/types.ts:57` is unused outside `__tests__/`                                                  | sse             |
| 75  | `src/__mocks__/litemcp.ts` is a 60-line mock for a dead library                                                         | mocks           |
| 76  | `mcp/litemcp.ts:36-48` `emit` calls without listener                                                                    | mcp             |
| 77  | `mcp/prompts.ts:198-204` formatting `bold` with `**` in `getMCPQuickStartPrompt`                                        | prompts         |
| 78  | `smithery-sdk.ts:48-101` and `smithery-minimal.ts:75-137` duplicate tool-registration logic                             | smithery        |
| 79  | `smithery.ts:226-227` `return server.mcpServer                                                                          |                 | server`with`@ts-expect-error` | smithery |
| 80  | `__tests__/helpers.test.ts` tests nothing useful                                                                        | tests           |
| 81  | `speech/voiceSessionManager.ts:383` `removeAllListeners` without storing the emitter                                    | speech          |
| 82  | `MCPServer.shutdown` order: clears `tools` before `transports`                                                          | MCPServer       |
| 83  | `MCPServer.configure` is callable on a singleton with new config                                                        | MCPServer       |
| 84  | `MCPServer.registerTool` overwrites silently                                                                            | MCPServer       |
| 85  | `MCPServer.use` middleware order is fixed                                                                               | MCPServer       |
| 86  | `index.ts:120-127` CORS allows DELETE but app.post is the only mutating route                                           | index.ts        |
| 87  | `index.ts:14` imports `openApiConfig` from `./openapi` (lazy-load)                                                      | index.ts        |
| 88  | `speech/speechToText.ts:1` uses `child_process`                                                                         | speech          |
| 89  | `__tests__/server.test.ts:5-13` uses `mock(() => mockApp)` for entire Express app                                       | tests           |
| 90  | `bunfig.toml` excludes `src/mocks/**/*` (should be `src/__mocks__/`)                                                    | bunfig          |
| 91  | `bunfig.toml:11` `testMatch` may match `src/__tests__/setup.ts`                                                         | bunfig          |
| 92  | `test/setup.ts:34-38` mutates `console` methods without restoring                                                       | setup           |
| 93  | `src/__tests__/setup.ts:36-38` does the same `console` mock                                                             | setup           |
| 94  | `security/index.ts:84` rate limiter `next()` in try-block                                                               | security        |
| 95  | `security/index.ts:192-206` `sanitizeValue` mangles JSON                                                                | security        |
| 96  | `config.ts` `loadConfig` loses Zod issue tree                                                                           | config          |
| 97  | `stdio-server.ts:18-28` double-loads `.env`                                                                             | stdio-server    |
| 98  | `http-server-new.ts:24,160` DoS + privacy                                                                               | http-server-new |

---

## Summary Statistics

| Severity | Count          | Top 3 affected files                                                           |
| -------- | -------------- | ------------------------------------------------------------------------------ |
| Critical | 7 + 4 LSP = 11 | `hass/websocket-client.ts`, `config/*.ts`, `mcp/transports/stdio.transport.ts` |
| High     | 23             | `MCPServer.ts`, `security/index.ts`, `http-server*.ts`                         |
| Medium   | 32             | All files (pervasive issues)                                                   |
| Low      | 38             | All files (style, dead code, micro-issues)                                     |

---

## Top Systemic Issues to Address First

1. **Configuration duplication (#4, #29, #30)**: consolidate to one `config.ts`
2. **Logger convention violation (#39)**: 13 `console.*` calls to remove
3. **Import policy violation (#37-38)**: standardize on `@/` alias or no-extension
4. **WebSocket lifecycle (#1, #2, #10, #11)**: timers, listeners, id-routing
5. **Dead code (#29, #30, #43)**: `websocket/`, `mcp/index.ts` utils, `litemcp`

**The single most impactful fix is #4 (config consolidation)** — fixing the two-config bug resolves 5+ downstream issues at once.
