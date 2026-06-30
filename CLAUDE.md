# CLAUDE.md

Guidance for Claude Code (and other Anthropic-powered agents) working in this
repository. Keep this file in sync with the real scripts in `package.json` and
`Taskfile.yml`.

## What this is

A production-grade HTTP microservice template:

- **Runtime:** Node 22 LTS, ES modules, TypeScript in `strict` mode.
- **Framework:** Fastify v5 with `fastify-type-provider-zod`.
- **Validation/contracts:** Zod schemas drive both runtime validation and the
  OpenAPI 3.1 document served at `/docs`.
- **Observability:** Pino structured logs + OpenTelemetry (traces, metrics, logs).
- **Config:** 12-factor, env-only, validated by Zod in `src/config.ts`.
- **Tooling:** pnpm, Biome (lint+format), tsup (build), Vitest (test).

## Commands (use pnpm, never npm/yarn)

| Task            | Command              |
| --------------- | -------------------- |
| Install         | `pnpm install`       |
| Dev server      | `pnpm dev`           |
| Build           | `pnpm build`         |
| Start (built)   | `pnpm start`         |
| Lint            | `pnpm lint`          |
| Format          | `pnpm format`        |
| Typecheck       | `pnpm typecheck`     |
| Test            | `pnpm test`          |
| Test + coverage | `pnpm test:cov`      |
| OpenAPI export  | `pnpm openapi`       |
| SBOM            | `pnpm sbom`          |

`Taskfile.yml` mirrors these (`task lint`, `task test`, `task security`, ...).

## Conventions you MUST follow

- **TypeScript strict.** No `any` (Biome errors on it). Prefer `unknown` + Zod
  narrowing. `noUncheckedIndexedAccess` is on — guard array/record access.
- **ESM import paths use the `.js` extension** (e.g. `import { x } from "./x.js"`)
  even though the source is `.ts`. This is required by `NodeNext` resolution.
- **Schemas first.** Every route declares Zod `body`/`querystring`/`params`/
  `response` schemas. Never read unvalidated input. The schema is the contract.
- **Errors** go through `src/errors.ts` (RFC 9457 Problem Details). Throw
  `AppError`/`NotFoundError`/`ConflictError`; do not hand-roll error responses.
- **No secrets in code.** Configuration is read only from the environment via
  `src/config.ts`. Add new settings to the Zod schema AND `.env.example`.
- **Keep `buildApp()` side-effect free** (no `.listen`) so integration tests can
  use `app.inject()`.

## Testing

- Unit tests in `test/unit/`, integration tests in `test/integration/` using
  `app.inject()` via the `buildTestApp()` helper.
- Coverage gate is **80%** (lines/functions/branches/statements). Adding a route
  or branch means adding a test.

## Before you open a PR

1. `pnpm lint && pnpm typecheck && pnpm test:cov` all green.
2. If routes/schemas changed, run `pnpm openapi` and review the diff.
3. Use **Conventional Commits** (`feat:`, `fix:`, `chore:`...). Releases are
   automated via release-please; the commit type drives the SemVer bump.
4. Commits must be **signed** (verified). See `docs/BRANCH-PROTECTION.md`.

## Safety / boundaries for agents

- Do not add long-lived cloud credentials or tokens anywhere. Cloud auth uses
  GitHub OIDC; image signing is keyless cosign.
- Do not unpin GitHub Actions or container digests. Actions are pinned to a full
  commit SHA with a version comment; Renovate updates them.
- Do not weaken the security plugins (`security-headers`, `rate-limit`) or the
  coverage threshold without an explicit request and a note in the PR.
