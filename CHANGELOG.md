# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog and this project follows Semantic Versioning with prerelease tags during early development.

## [Unreleased]

- No unreleased entries yet.

## [0.2.0-alpha] - 2026-02-21

### Added
- NestJS-backed shared API flow for agent sessions, turn submission, and SSE streaming in `apps/api`.
- Step-wise chat surface wiring in web/electron so UI state hydrates from session state and live events.
- Runtime fail-fast behavior when required model keys are missing plus timeout handling for stuck turns.
- Root `.env` template for local development keys and API URL overrides.

### Changed
- Desktop dev orchestration now starts API + web + electron together through Turbo task IDs.
- Electron startup wait targets now include API health endpoint readiness.
- Agent stream handling improved to support both chunked and full assistant message stream outputs.

### Fixed
- Nest controller dependency injection edge case causing repeated `/health` runtime errors.
- Silent prompt failures now emit explicit error events/messages instead of hanging without feedback.

## [0.1.0-alpha.1] - 2026-02-16

### Added
- Turborepo monorepo structure with `apps/web`, `apps/electron`, `apps/tui`, `apps/api`, and `packages/agent-core`.
- Versioned, per-surface release notes under `releases/0.1.0-alpha.1/`.
- NestJS API scaffold under `apps/api`.
- Unit tests for `@repo/agent-core` using Vitest.

### Changed
- Moved shared agent runtime into `packages/agent-core` and rewired web/electron/tui runtimes to consume it.
- Improved release validation to enforce workspace version alignment and required per-surface release files.
- Updated root/workspace package versions to `0.1.0-alpha.1`.

## [0.1.0-alpha] - 2026-02-15

### Added
- Electron + Next.js app wiring for local desktop UI development.
- Mini agent framework primitives (engine, transports, registry, session store).
- Assorted agent experiments and tool integrations (now archived under `legacy-archive/agents/`).

### Changed
- Chat UI message handling and session hydration improvements.
- Input/run contract iterations for engine execution.

### Notes
- This is an incomplete first alpha intended to establish public release cadence.
- No production guarantees; APIs and folder structure may change without notice.
