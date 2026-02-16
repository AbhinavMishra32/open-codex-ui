# Release Checklist

Use this checklist for every prerelease.

## Preflight

- Ensure `main` is clean: `git status`
- Confirm app runs locally: `npm run dev:desktop`
- Confirm changelog has release notes for target version

## Versioning

- Set `package.json` version (example: `0.1.1-alpha`)
- Add matching section in `CHANGELOG.md` as `[0.1.1-alpha] - YYYY-MM-DD`
- Keep `Unreleased` section for subsequent work

## Validate

```bash
npm run release:check
```

## Publish

```bash
git add -A
git commit -m "release: v0.1.1-alpha"
git tag -a v0.1.1-alpha -m "v0.1.1-alpha"
git push origin main
git push origin v0.1.1-alpha
```

## After publish

- Verify GitHub prerelease was created
- Confirm release notes match changelog section
- Add follow-up issues for known gaps and regressions
