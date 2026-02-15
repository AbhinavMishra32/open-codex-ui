# open-codex-ui

Codex-style macOS UI and interaction model built with Electron, with a focus on strong, senior-level architecture. Think "Claude Code feel" with a desktop-native shell and a more opinionated UI direction.

## Status

- Current release channel: **alpha**
- Current version: **0.1.0-alpha**
- Stability: **incomplete / experimental**
- License: **MIT**

## What exists today

- Electron shell for desktop chat-style interaction
- Next.js frontend UI
- Mini agent framework with transports, sessions, and tool hooks
- Archived exploratory agent implementations in `legacy-archive/agents/`

## Local development

```bash
npm install
npm run start
```

This runs Next.js on `http://localhost:3000` and starts the Electron process once the UI server is up.

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
