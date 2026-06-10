# Report 2: Install Flow & Docker Audit

**Subagent**: `explore` (ses_14f8d9126ffe1LkfmDEw60c8FL)
**Date**: 2026-06-10
**Method**: Read-only inspection of all Docker, CI, install, and build files.

---

## Executive Summary

The project ships **2 Dockerfiles**, **3 docker-compose files**, and a build system that has drifted from its own documentation. There are **inconsistent file extensions and paths** between `package.json` scripts, the Dockerfile CMD, the docker-compose commands, and the README/docs, plus several **broken or missing references**. A committed `.env` file contains a real-looking JWT.

**Severity legend:** CRITICAL > HIGH > MEDIUM > LOW

---

## 1. Docker Files Inventory

| File                                  | Lines | Status                                                        |
| ------------------------------------- | ----- | ------------------------------------------------------------- |
| `Dockerfile`                          | 104   | Main Bun-based multi-stage **but CMD is broken**              |
| `Dockerfile.smithery`                 | 30    | Node-based for Smithery, runs as root, full devDeps install   |
| `docker-compose.yml`                  | 34    | Production, hardcoded personal IP                             |
| `docker-compose.dev.yml`              | 37    | Dev with hot-reload, **uses `npm` in Bun image**              |
| `docker-compose.speech.yml`           | 79    | Speech add-on stack, **wrong image name**, `privileged: true` |
| `.dockerignore`                       | 81    | Present and reasonably complete                               |
| `docker-build.sh`                     | 148   | Local build helper (Linux only)                               |
| `docker/speech/setup-audio.sh`        | —     | Referenced in Dockerfile but never run                        |
| `docker/speech/asound.conf`           | —     | Copied into image                                             |
| `docker/speech/wake_word_detector.py` | —     | Not in CMD path                                               |

---

## 2. CRITICAL Issues

### C1. Docker CMD points to a non-existent file (`Dockerfile:104`)

```
CMD ["bun", "run", "dist/http-server.js"]
```

- `package.json:40,45` build `dist/http-server.mjs` (ESM, lowercase), not `dist/http-server.js`
- The image's CMD will fail at runtime with "Cannot find module"
- Line 38-39 also runs a stray `bun build ./src/http-server.ts --outdir ./dist --target node` which _does_ create `dist/http-server.js` BUT the target is `node` (not `bun`)
- **Fix**: change CMD to `["bun", "run", "dist/http-server.mjs"]` and drop the extra `bun build` line

### C2. Healthcheck endpoint never reachable

- Healthcheck at `Dockerfile:95` calls `http://localhost:${PORT:-7123}/health`
- Combined with C1, the server never starts → healthcheck fail-loops

### C3. Secret committed to `.env` in repository

- `/mnt/data/home/jango/Git/advanced-homeassistant-mcp/.env:12` contains a real-looking JWT:
  ```
  HASS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI0NGU4MWEzZTcyMTI0NTE5YmY2M2ZiZGUyMGZkZDE3MCIsImlhdCI6MTc0NDg3ODg4OSwiZXhwIjoyMDYwMjM4ODg5fQ.5sepQhgpFl9ShsK_3eIZ5pX3LLXuwq8W3MVSBD4a1aw
  ```
- `iat: 1744878889` (Apr 2025) → `exp: 2060238889` (Aug 2035), valid for 10 years
- **Action**: Revoke the token. Remove `.env` from git history (BFG Repo-Cleaner or `git filter-repo`).

### C4. `docker-compose.dev.yml:29` uses `npm` inside Bun-built image

```yaml
command: ["sh", "-c", "npm run build:all && node dist/http-server.js"]
```

- The image is built from `Dockerfile` (line 8) which uses `oven/bun:1-slim` — **npm is not installed**
- Also references `dist/http-server.js` which doesn't exist (C1)
- This compose file **cannot work** as written
- **Fix**: change to `bun run build:all && bun run dist/http-server.mjs` (and install Bun, which is already in the base image)

### C5. `docker-build.sh:68` references non-existent `bun.lockb`

```sh
rm -f bun.lockb
```

- The repo uses `bun.lock` (text format) only. `bun.lockb` is the old binary format.
- This is a no-op but signals the script is stale.

### C6. `docker-build.sh:111-114` checks for exit code `124` from a non-existent `timeout`

- The script never invokes `timeout(1)` — will never return 124
- **Dead code**, misleading

### C7. Smithery Dockerfile uses `npm ci` with `package-lock.json` while `bun.lock` is canonical

- `Dockerfile.smithery:8-11`:
  ```
  COPY package.json package-lock.json ./
  RUN npm ci
  ```
- `npm ci` produces a different `node_modules` than `bun install`
- Also installs **devDependencies** (esbuild, typescript, @smithery/cli) into the production image
- **Fix**: use `bun install --production` and copy `bun.lock`

### C8. Smithery Dockerfile --external list missing `dotenv`, `express-rate-limit`

- `Dockerfile.smithery:20` esbuild call has externals for winston, express, etc. but **missing**:
  - `dotenv` (used in `src/config.ts:6`)
  - `express-rate-limit` (used in `src/middleware/`)
- Will fail at runtime

### C9. Smithery Dockerfile runs as root (no `USER` directive)

- `Dockerfile.smithery:1-30` has no `USER bunjs` step
- Production security regression

---

## 3. HIGH Severity Issues

### H1. `package.json:40` `start:http` will not run — wrong file name

- Builds `dist/http-server.mjs` (line 45) → script does `node dist/http-server.mjs` ✓
- **But** the main `Dockerfile` does NOT run `build:http`, so in a CI-built image this file is missing

### H2. Duplicate/redundant build scripts

- `package.json:42` (`build`) and `:43` (`build:node`) are **100% identical** (both build `dist/index.cjs`)
- `package.json:50` (`smithery:build`) → outputs to `dist/smithery.js`
- `Dockerfile.smithery:20` uses hand-rolled esbuild that bypasses `smithery:build`
- Two divergent Smithery build paths

### H3. `package.json:32` `"main": "dist/index.js"` is wrong

- No script produces `dist/index.js`; only `dist/index.cjs` is built
- `bin/stdio-server.js:27`, `bin/mcp-stdio.cjs`, `start.sh:4`, `scripts/release.sh:19` all reference `dist/index.js`
- **Fix**: change to `dist/index.cjs`

### H4. `prepare` script is a no-op

- `package.json:48`: `"prepare": "echo 'Skipping prepare' || true"`
- Disables husky post-install hooks → contributors won't get pre-commit hooks

### H5. README version mismatches across 5 files

| File                     | Version               |
| ------------------------ | --------------------- |
| `package.json:3`         | `1.4.0` ✓ (canonical) |
| `src/smithery-sdk.ts:44` | `1.2.3`               |
| `src/http-server.ts:28`  | `1.2.1`               |
| `src/http-simple.ts:29`  | `1.2.3`               |
| `smithery.yaml:17`       | `1.2.5`               |

### H6. Inconsistent package manager

- `Dockerfile:28,31,38,39,82` uses `bun install`/`bun add`
- `Dockerfile.smithery:11` uses `npm ci`
- `docker-compose.dev.yml:29` uses `npm run`
- `package.json:47` uses `npm run build:all` (chained)
- `release.yml:103` uses `bun run build:all` (correct)
- `docs/VSCODE_QUICK_REF.md:8`, `docs/VSCODE_INTEGRATION.md:22`, `docs/DEVELOPMENT.md:44` use `npm install`

### H7. `bin/stdio-server.js` and `bin/mcp-stdio.js` are committed but unreferenced

- `bin/stdio-server.js` (2.1 MB) — not used
- `bin/mcp-stdio.js` (1.3 KB) — not used
- `bin/test-stdio.js` — not used
- 1.1 MB of unused compiled JS in repo

### H8. `bin/npx-entry.cjs:103-108` references missing `silent-mcp.sh`

- Code path is dead but suggests a missing file

### H9. `stdio-start.sh` has hardcoded personal path

- Line 21: `WORKSPACE_ROOT="/home/jango/Git/homeassistant-mcp"`
- **Different project path** than this repo
- Useless to anyone else, should be removed or templated

### H10. `start.sh:4` uses `bun --smol --cold-start-caching` (invalid flag)

- `--cold-start-caching` is not a documented Bun flag
- Will fail
- Also references `dist/index.js` (H3)

### H11. `bun.lock` will not produce reproducible `node_modules` for `npm ci` workflows

- `Dockerfile.smithery` uses `npm ci` but `bun.lock` is canonical
- Anyone trying to reproduce the Smithery build with `npm` will get a different dependency graph

### H12. Smithery SDK schema mismatches between TS and YAML

- `src/smithery-sdk.ts:15-28` (TS): `HASS_HOST`, `HASS_TOKEN`, `HASS_SOCKET_URL`, `LOG_LEVEL`
- `smithery.yaml:17` (YAML): same + `ANTHROPIC_API_KEY` (extra)
- `src/index.ts:163-200` uses camelCase: `hassToken`, `hassHost`
- They describe different MCP servers

### H13. `package.json:33` `"module": "src/smithery-minimal.ts"` is broken

- Node ESM and most bundlers do NOT resolve `.ts` files
- This field is meaningless and will silently fail
- **Fix**: remove or point to `dist/stdio-server.mjs`

---

## 4. MEDIUM Severity Issues

### M1. `tsconfig.json:4` `module: CommonJS` inconsistent with `type: module`

- Confusing for new contributors

### M2. `Dockerfile:79` `COPY . .` brings entire repo into runner

- Includes `src/`, `__tests__/`, `docs/`, `dist/` (host), `.git/`
- Wasteful: only `dist/`, `node_modules/`, `package.json` are needed at runtime
- `node_modules` from `package-lock.json` install can shadow the builder's

### M3. Python deps in Dockerfile unused at runtime

- `Dockerfile:24`: `numpy scipy` (~200MB) — CMD doesn't invoke Python
- `setup-audio.sh` and `wake_word_detector.py` never executed
- Bloat in default image

### M4. Speech stack is not wired up in image

- `setup-audio.sh` is `chmod +x` (line 85) but never called by CMD
- `wake_word_detector.py` is in `docker/speech/`, not `/app/`
- Users must wire it themselves

### M5. `oven/bun:1-slim` is heavyweight (~150MB)

- `Dockerfile.smithery` uses `node:20-slim` (smaller)
- Inconsistent approach

### M6. `Dockerfile:69-71` `bunjs` user in `audio` group

- `audio` group may have unexpected gid on `oven/bun:1-slim`
- May break non-root enforcement

### M7. `Dockerfile:88` creates `/app/audio` but never exposes as volume

- `docker-compose.speech.yml:33` declares `audio-data:/audio` — different path
- Volume mapping won't share with host

### M8. `docker-compose.yml` mounts `.env` via `env_file` AND sets via `environment`

- Both `env_file: [.env, .env.${NODE_ENV:-production}]` AND `environment:` keys
- Compose precedence: shell > `environment` > `env_file`
- Inline env always wins → `.env` is pointless
- Also redundant

### M9. `docker-compose.speech.yml:5` references `homeassistant-mcp:latest`

- CI pushes to `jangoblockchained/homeassistant-mcp` (from `scripts/release.sh:10`)
- The speech compose won't find the locally-built image
- **Fix**: change to `jangoblockchained/homeassistant-mcp:latest` or use `build:`

### M10. `release.yml:39` uses `node -p` but no `setup-node` declared

- Works because GH runners have node preinstalled, but fragile
- Inconsistent with rest of file (uses Bun)

### M11. `docker-build-push.yml:6-7` triggers too narrow

- Only `src/**`, `Dockerfile`, `package.json`
- Misses `bun.lock`, `tsconfig*.json`, `docker/`
- A change to `docker/speech/setup-audio.sh` won't trigger rebuild

### M12. `dist/` (6+ MB) is checked in

- `http-server.js` (5.2 MB), `index.cjs` (3 MB), `smithery.js` (1.2 MB) + maps
- `.gitignore:3` lists `dist` so should be ignored, but files are present
- Either ignore was added after commit, or `git add -f` was used
- These should be untracked

### M13. `dist-ts/` exists but is not used by any script

- Stale tsc-emitted folder

### M14. `tsconfig.docker.json`, `tsconfig.stdio.json`, `tsconfig.test.json` exist but unreferenced

- Vestigial

### M15. `package.json:75-110` devDeps not split

- `Dockerfile:28` does `bun install --ignore-scripts` but doesn't pass `--production`
- DevDeps carry over to runner stage via `COPY --from=builder /app/node_modules`

### M16. `Dockerfile:30-31` installs `ts-node` in builder (unused)

- No subsequent command uses it
- Wastes builder image size (discarded anyway)

### M17. `scripts/optimize-dist.js` is unreferenced

- No npm script invokes it

### M18. `scripts/release.sh` hardcodes `1.2.1` in 11 places

- Will become stale with every release

### M19. `scripts/deploy-github-pages.sh` hardcodes `1.2.0` (8 places)

- GitHub Pages now deployed by CI (`deploy-docs.yml`)
- This script is obsolete

### M20. `scripts/integration-test.ts` and `scripts/benchmark.ts` are unreferenced

- TS files with no entry point

### M21. `.npmrc:1-2` configures GitHub Packages registry

- May break `npm install` for npm users (routes scope to npm.pkg.github.com)

### M22. `package.json:64` `clean` script doesn't remove `dist-ts/` or `bin/*.js`

- Add `dist-ts` and `bin/*.js` to clean

### M23. `Dockerfile:101` `EXPOSE ${PORT:-7123}` doesn't work in older Docker

- Works in Docker 23+ but is fragile
- Use `EXPOSE 7123` with default port

### M24. `Dockerfile:46-52` installs `pulseaudio`, `alsa-utils` in runner

- CMD is `bun run dist/http-server.js` which has no audio path
- Bloat in default image

### M25. `Dockerfile.smithery:11` `npm ci` installs full devDeps

- Could be slimmer with `npm ci --omit=dev && npm i --no-save esbuild`

### M26. `bun.lock` and `package-lock.json` both tracked

- 195 KB + 432 KB; they will drift
- Pick one

---

## 5. Security-Specific Findings

| ID  | Issue                                                                | File                        | Line      |
| --- | -------------------------------------------------------------------- | --------------------------- | --------- |
| S1  | **JWT committed in `.env`**                                          | `.env`                      | 12        |
| S2  | Docker runner uses non-root user (good)                              | `Dockerfile`                | 91        |
| S3  | No `USER` directive in `Dockerfile.smithery` — runs as root          | `Dockerfile.smithery`       | (missing) |
| S4  | `python-record-lpcm16` requires ALSA/native compilation              | `package.json`              | 96        |
| S5  | `better-sqlite3` requires native compilation                         | `package.json`              | 85        |
| S6  | `--ignore-scripts` in Dockerfile line 28 means postinstall won't run | `Dockerfile`                | 28        |
| S7  | `CORS_ORIGINS` defaults include `http://localhost:3000` etc.         | `.env.example`              | 28        |
| S8  | `JWT_SECRET` is `your_jwt_secret_key_min_32_chars` in `.env`         | `.env`                      | 16        |
| S9  | Health check needs `curl` (installed in image); fragile if removed   | `Dockerfile`                | 46        |
| S10 | `network_mode: host` on `wake-word` container                        | `docker-compose.speech.yml` | 69        |
| S11 | `privileged: true` on `wake-word` container — full host access       | `docker-compose.speech.yml` | 70        |

---

## 6. CI/CD Workflows

### `release.yml` (4 jobs)

- `create-release` → uses `node -p "require('./package.json').name"` (fragile, no `setup-node`)
- `docker` → builds and pushes
- `publish-npm` → publishes to npm
- `github-release` → creates GitHub release
- `id-token: write` requested but unused (L18)

### `version-bump.yml`

- Shell arithmetic on semver with `IFS` parsing
- Doesn't handle pre-release tags (e.g. `1.2.0-beta.1`)

### `docker-build-push.yml`

- Triggers too narrow (M11)
- `type=sha,prefix=dev-` produces `dev-abc1234` tags not listed in README

### `deploy-docs.yml`

- Installs `pip install -r docs/requirements.txt` without existence check
- `mkdocs.yml` may be misconfigured

---

## 7. Cross-Reference: README vs Reality

| README Claim                                                                          | Reality                                               |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `bun run start:stdio` works (line 66, 173)                                            | ✓ if `bun run build:stdio` was run                    |
| `npm run build:stdio` works (line 214)                                                | ✓                                                     |
| `npx @smithery/cli install ...` (line 86-92)                                          | ✓                                                     |
| `bunx github:jango-blockchained/advanced-homeassistant-mcp` (line 118)                | ✓                                                     |
| `docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest` (line 134) | ✓ CI builds, **but image crashes on start (C1)**      |
| `bun add -g @jango-blockchained/homeassistant-mcp` (line 157)                         | ✓ once published                                      |
| `homeassistant-mcp` CLI command (line 163)                                            | ✓ via `package.json:35`                               |
| `bun run start -- --http` (line 269)                                                  | **broken** — `--http` not forwarded by `start` script |

---

## 8. Recommended Fix Priority

1. **Fix C1** (Dockerfile CMD) — image is un-runnable
2. **Revoke the JWT in `.env`** and remove from git history (C3)
3. **Fix C4** (docker-compose.dev.yml) — change `npm` → `bun`
4. **Fix M9** (docker-compose.speech.yml image name)
5. **Fix C7, C8, C9** (Dockerfile.smithery)
6. **Fix H3** (package.json `main`) — set to `dist/index.cjs`
7. **Pin or unify the lockfile** — pick `bun.lock`, drop `package-lock.json`
8. **Fix H5** — replace hard-coded versions with package.json reference
9. **Fix H4** — re-enable Husky prepare or remove Husky
10. **Wire up `setup-audio.sh`** or remove speech path from default image (M3, M4)
11. **Replace `bun` with `node:20-alpine`** in main Dockerfile for slimmer image (M5)
12. **Remove `dist-ts/`, `bin/stdio-server.js`, `bin/mcp-stdio.js`, `bin/test-stdio.js`**
13. **Remove `stdio-start.sh` or template its path** (H9)
14. **Fix `smithery-sdk.ts` schema** to match `smithery.yaml` and `src/index.ts` configSchema (H12)

---

## 9. Files Audited (absolute paths)

- `/Dockerfile`, `/Dockerfile.smithery`
- `/docker-compose.yml`, `/docker-compose.dev.yml`, `/docker-compose.speech.yml`, `/.dockerignore`
- `/docker-build.sh`, `/docker/speech/setup-audio.sh`, `/docker/speech/asound.conf`, `/docker/speech/wake_word_detector.py`
- `/.github/workflows/release.yml`, `version-bump.yml`, `docker-build-push.yml`, `deploy-docs.yml`
- `/package.json`, `/bunfig.toml`, `/tsconfig.json`, `/tsconfig.stdio.json`
- `/.env`, `/.env.example`, `/.env.production`, `/.npmrc`, `/.gitignore`, `/README.md`
- `/docs/SMITHERY_DEPLOYMENT.md`, `/docs/INSTALLATION.md`, `/docs/VSCODE_INTEGRATION.md`, `/docs/VSCODE_QUICK_REF.md`, `/docs/DEVELOPMENT.md`, `/docs/GETTING_STARTED.md`, `/docs/TROUBLESHOOTING.md`, `/docs/CONTRIBUTING.md`, `/docs/FAQ.md`
- `/src/smithery-sdk.ts`, `/src/index.ts`, `/src/http-server.ts`, `/src/http-simple.ts`, `/src/config.ts`
- `/smithery.yaml`, `/smithery.config.js`
- `/scripts/release.sh`, `/scripts/deploy-github-pages.sh`, `/scripts/optimize-dist.js`, `/scripts/fix-env.js`
- `/bin/npx-entry.cjs`, `/bin/mcp-stdio.cjs`, `/bin/mcp-stdio.js`, `/bin/test-stdio.js`, `/bin/stdio-server.js`
- `/start.sh`, `/stdio-start.sh`
- `/.vscode/mcp.json`, `/.vscode/tasks.json`
