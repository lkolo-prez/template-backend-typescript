# AGENTS.md

Machine-readable contributor guide following the [agents.md](https://agents.md)
open standard. Applies to any AI coding agent (OpenAI Codex, Cursor, Aider, etc.)
operating in this repository. Human contributors: see `CONTRIBUTING.md`.

## Project overview

Fastify v5 HTTP microservice template. Node 22 LTS, TypeScript strict, pnpm,
Zod-validated config and routes, OpenAPI 3.1 at `/docs`, Pino + OpenTelemetry,
Biome, tsup, Vitest.

## Setup

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env   # adjust as needed
```

## Dev / build / run

```bash
pnpm dev      # watch-mode server (tsx)
pnpm build    # bundle with tsup -> dist/
pnpm start    # run the built server
```

## Validation commands (run before every commit)

```bash
pnpm lint        # Biome lint
pnpm format      # Biome format (writes)
pnpm typecheck   # tsc --noEmit
pnpm test:cov    # Vitest + 80% coverage gate
```

All four must pass. CI runs the same commands; do not bypass them.

## Code style

- ES modules; **import specifiers end in `.js`** (NodeNext resolution).
- TypeScript `strict` + `noUncheckedIndexedAccess`. No `any`.
- Double quotes, semicolons, trailing commas, 2-space indent, 100-col width
  (enforced by Biome — let the formatter decide, do not argue with it).
- Conventional Commits for every commit message.

## Architecture rules

- Routes live in `src/routes/`; each declares Zod schemas for input and output.
- Cross-cutting concerns are Fastify plugins in `src/plugins/` and
  `src/middlewares/`, registered in `src/app.ts`.
- Errors use RFC 9457 Problem Details via `src/errors.ts`. Do not write ad-hoc
  error payloads.
- Configuration is environment-only, validated in `src/config.ts`. New config =
  new field in the Zod schema **and** in `.env.example`.
- `buildApp()` must not call `.listen()`; the process bootstrap lives in
  `src/server.ts`.

## Testing instructions

- Add/extend tests under `test/unit/` or `test/integration/`.
- Integration tests use `app.inject()` through `buildTestApp()` (see
  `test/helpers.ts`). No real network/port binding in tests.
- Keep coverage at or above 80%.

## Security & supply chain (do not regress)

- No secrets, tokens, or long-lived credentials in code or fixtures.
- Cloud auth = GitHub OIDC; image signing = keyless cosign; SBOM via syft.
- GitHub Actions are pinned to commit SHAs; container bases to digests
  (Renovate manages updates). Never replace with floating tags.

## PR instructions

- Title: Conventional Commit format, e.g. `feat(widgets): add bulk import`.
- Ensure `pnpm lint && pnpm typecheck && pnpm test:cov` pass locally.
- Regenerate `openapi.json` (`pnpm openapi`) when the API surface changes.
- Commits must be signed/verified (see `docs/BRANCH-PROTECTION.md`).
