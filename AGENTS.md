# AGENTS.md

This file is a handoff guide for future coding agents working in this repository.

## Project Status

- Monorepo: Turborepo + npm workspaces.
- Current release line: `0.1.0-alpha.1`.
- Branch/release policy: commits to `main`, tag `v<version>` for GitHub prerelease.

## Repository Layout

- `apps/web`: Next.js UI.
- `apps/electron`: Electron host app.
- `apps/tui`: Ink terminal UI.
- `apps/api`: NestJS API scaffold.
- `packages/agent-core`: Shared agent runtime, tools, transports, session primitives.
- `releases/<version>/`: Required per-surface release notes.
- `scripts/release/`: Release validation/note generation scripts.

## Package Manager Rules

- Use `npm` only.
- Root `packageManager` is `npm@11.7.0`.
- Do not run `yarn` in this repo.

## Primary Commands

- Install: `npm install`
- Desktop dev (web + electron): `npm run dev:desktop`
- Web only: `npm run dev:web`
- TUI only: `npm run dev:tui`
- API only: `npm run dev:api`
- Typecheck all: `npm run typecheck`
- Build all: `npm run build`
- Test all configured packages: `npm test`
- Agent core tests only: `npm --workspace packages/agent-core run test`
- Release validation: `npm run release:check`
- Release notes generation: `npm run release:notes`

## CI and Release Automation

- CI workflow: `.github/workflows/ci.yml`
  - Runs on PR to `main` and push to `main`.
  - Steps: `npm ci`, `release:check`, agent-core tests, monorepo typecheck, monorepo build.

- Release workflow: `.github/workflows/release.yml`
  - Runs on `v*` tags.
  - Steps: `npm ci`, `release:check`, generate aggregated release notes, publish GitHub release.

## Release Contract (Strict)

For version `X`:

1. Root `package.json` version must be `X`.
2. All workspace package versions must match root version.
3. `CHANGELOG.md` must contain `## [X]` section.
4. `releases/X/` must contain all files:
   - `web.md`
   - `electron.md`
   - `tui.md`
   - `api.md`
   - `agent-core.md`

`npm run release:check` enforces all of the above.

## Known Gotchas and Fixes

### 1) Next.js lockfile patch noise (Yarn/Corepack spam)

Symptom:
- Next logs: `Found lockfile missing swc dependencies, patching...`
- Then repeated Yarn/Corepack errors.

Fix implemented:
- `apps/web/package.json` sets env var on dev/build:
  - `NEXT_IGNORE_INCORRECT_LOCKFILE=1 next dev`
  - `NEXT_IGNORE_INCORRECT_LOCKFILE=1 next build --webpack`

### 2) Web build Turbopack panic in constrained environments

Symptom:
- Turbopack panic with `binding to a port` / OS permission error.

Fix implemented:
- Use webpack for production build (`next build --webpack`).

### 3) Electron startup crash if `TAVILY_API_KEY` missing

Symptom:
- App crashed during module load from Tavily client initialization.

Fix implemented:
- `packages/agent-core/src/tools/webSearch.ts` lazily initializes Tavily.
- If key missing, tool returns safe message instead of crashing process.

### 4) Silent “no response” after prompt in Electron

Fixes implemented:
- `packages/agent-core/src/core/engine.ts` now handles both `AIMessageChunk` and full `AIMessage` stream outputs.
- `apps/electron/src/electron-app.ts` wraps prompt handling with `try/catch`, emits `ERROR`, and stores assistant error text.
- `apps/web/components/App.tsx` displays error events inline as system messages (no silent failure).

### 5) Corrupted `node_modules` causing fs-extra/electron install errors

If you see errors like:
- `TypeError: u is not a function` in `fs-extra`
- zero-byte files in `node_modules` (e.g. `universalify/index.js`)

Use deterministic reset:

```bash
rm -rf node_modules
rm -rf ~/.npm/_cacache
npm cache clean --force
npm install
```

## Environment Expectations

- `OPENAI_API_KEY` should be set for actual model responses.
- `TAVILY_API_KEY` is optional; without it, web search tool degrades gracefully.
- Electron web URL defaults to `http://localhost:3000` and can be overridden with `WEB_URL`.

## Testing Notes

- Core unit tests use Vitest in `packages/agent-core/tests`.
- Current tests cover:
  - `AgentEngine` streaming/event behavior and error dispatch.
  - `MemorySessionStore` create/get/save lifecycle and revision updates.

## When Preparing the Next Release

1. Update versions in root + all workspace package.json files.
2. Add/change release notes under `releases/<version>/`.
3. Add changelog section for the version.
4. Run:
   - `npm run release:check`
   - `npm --workspace packages/agent-core run test`
   - `npm run typecheck`
   - `npm run build`
5. Commit, tag `v<version>`, push `main`, push tag.

