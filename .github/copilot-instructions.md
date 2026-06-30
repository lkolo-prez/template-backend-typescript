# GitHub Copilot — Repository Custom Instructions

These instructions apply to GitHub Copilot Chat and code completions in this
repository. Keep them aligned with `CLAUDE.md` and `AGENTS.md`.

## Stack

Node 22 LTS - TypeScript (strict, ESM) - Fastify v5 - Zod - Pino -
OpenTelemetry - pnpm - Biome - tsup - Vitest.

## Always

- Use **pnpm** for all package operations (never npm or yarn).
- Write ESM with `.js` import specifiers (NodeNext), e.g. `from "./config.js"`.
- Define **Zod schemas** for any route input/output and reuse them; do not parse
  raw request data manually.
- Throw the error classes in `src/errors.ts` (`AppError`, `NotFoundError`,
  `ConflictError`) so responses stay RFC 9457 Problem Details.
- Read configuration only via `src/config.ts`; add new env vars to the Zod schema
  and to `.env.example`.
- Use Conventional Commits in suggested commit messages.

## Never

- Never introduce `any` (Biome errors on it) — prefer `unknown` + Zod.
- Never add secrets, API keys, or long-lived credentials. Cloud auth is OIDC;
  signing is keyless cosign.
- Never unpin GitHub Actions (full commit SHA + version comment) or container
  base digests.
- Never call `.listen()` inside `buildApp()`; that belongs in `src/server.ts`.
- Never lower the 80% coverage gate.

## Testing

Suggest Vitest tests in `test/unit/` (pure logic) or `test/integration/`
(HTTP via `app.inject()` using `buildTestApp()`). New branches need new tests.
