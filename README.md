# open-codex-ui

Codex-style developer UX built as a Turborepo monorepo: Electron desktop shell, Next.js web UI, Ink TUI, NestJS API, and a shared agent core package.

## Status

- Current release channel: **alpha**
- Current version: **0.1.0-alpha**
- Stability: **incomplete / experimental**
- License: **MIT**

## Monorepo layout

```txt
apps/
  web/       Next.js UI
  electron/  Electron host app
  tui/       Ink terminal UI
  api/       NestJS API
packages/
  agent-core/ shared agent runtime, transports, tools, and session state
legacy-archive/
  previous experiments and old structure
```

## Local development

```bash
npm install
npm run dev:desktop
```

Useful commands:

```bash
npm run dev:web
npm run dev:desktop
npm run dev:tui
npm run dev:api
npm run build
npm run typecheck
```

## Release policy

- Early releases use pre-release semver tags: `0.x.y-alpha`, `0.x.y-beta`
- Changelog is maintained manually in `CHANGELOG.md`
- GitHub prereleases are created from version tags (`v0.x.y-alpha`)

## How to publish the next prerelease

1. Update `CHANGELOG.md` by moving items from `Unreleased` into a new version section.
2. Bump the version in `package.json`.
3. Run checks:

```bash
npm run release:check
```

4. Commit and tag:

```bash
git add -A
git commit -m "release: v0.x.y-alpha"
git tag -a v0.x.y-alpha -m "v0.x.y-alpha"
```

5. Push branch and tag:

```bash
git push origin main
git push origin v0.x.y-alpha
```

6. GitHub Actions workflow `.github/workflows/release.yml` will publish a prerelease using the matching section from `CHANGELOG.md`.

## Notes

- This repository is currently source-first. Binary packaging/signing is not wired yet.
- Until packaging is added, the GitHub release should clearly state this is an experimental build from source.
