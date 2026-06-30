# template-backend-typescript

[![CI](https://github.com/aircloud/template-backend-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/aircloud/template-backend-typescript/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/aircloud/template-backend-typescript/badge)](https://securityscorecards.dev/viewer/?uri=github.com/aircloud/template-backend-typescript)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

A **production-grade HTTP microservice template** for AirCloud backend services.
Copy this repository (it is a GitHub *template repo*) to bootstrap a new service
with security, observability, testing and CI/CD wired up from day one.

> Example placeholders used throughout — **replace before going to production**:
> GitHub org `aircloud`, container registry `ghcr.io/aircloud`, Azure naming
> prefix `aircloud`. Search-and-replace `aircloud` and the service name.

## Stack

| Concern        | Choice                                                       |
| -------------- | ----------------------------------------------------------- |
| Runtime        | Node 22 LTS, ES modules                                      |
| Language       | TypeScript (`strict`, `noUncheckedIndexedAccess`)           |
| Package manager| pnpm                                                         |
| HTTP framework | Fastify v5                                                   |
| Validation     | Zod (+ `zod-to-openapi` / `fastify-type-provider-zod`)      |
| API docs       | OpenAPI 3.1 served at `/docs`                                |
| Logging        | Pino (structured JSON, redaction)                           |
| Telemetry      | OpenTelemetry (traces + metrics + logs over OTLP/HTTP)      |
| Config         | 12-factor, env-only, validated by Zod                       |
| Testing        | Vitest (unit + integration via `app.inject()`), 80% gate    |
| Lint/format    | Biome                                                        |
| Build          | tsup                                                         |
| Container      | Multi-stage -> `gcr.io/distroless/nodejs22-debian12:nonroot`|

## Quick start

```bash
corepack enable
pnpm install
cp .env.example .env

pnpm dev          # http://localhost:3000  (docs at /docs)
```

Try the example API:

```bash
curl -s localhost:3000/health/live | jq
curl -s -XPOST localhost:3000/v1/widgets \
  -H 'content-type: application/json' \
  -d '{"name":"gizmo","color":"blue","quantity":5}' | jq
curl -s localhost:3000/v1/widgets | jq
```

## Common commands

```bash
pnpm dev          # watch-mode dev server
pnpm build        # bundle to dist/
pnpm start        # run the built server
pnpm lint         # Biome lint
pnpm format       # Biome format (writes)
pnpm typecheck    # tsc --noEmit
pnpm test:cov     # tests + coverage gate (>= 80%)
pnpm openapi      # write openapi.json from the Zod schemas
pnpm sbom         # CycloneDX SBOM via syft
```

`Taskfile.yml` mirrors these and adds `task security`, `task docker:build`,
`task docker:scan`. See `task --list`.

## Project layout

```
src/
  server.ts          process bootstrap + graceful shutdown + healthcheck mode
  app.ts             buildApp(): assembles Fastify (listen-free, test-friendly)
  config.ts          Zod-validated 12-factor configuration
  logger.ts          Pino logger (JSON + redaction)
  telemetry.ts       OpenTelemetry SDK bootstrap (OTLP)
  errors.ts          RFC 9457 Problem Details error handling
  middlewares/
    request-id.ts    x-request-id correlation
  plugins/
    sensible.ts      @fastify/sensible
    rate-limit.ts    @fastify/rate-limit
    security-headers.ts
  routes/
    health.ts        /health/live, /health/ready
    v1/widgets.ts    example CRUD with Zod schemas + OpenAPI
test/                Vitest unit + integration suites
docs/                ARCHITECTURE.md, BRANCH-PROTECTION.md, runbooks
```

## Configuration

All configuration comes from the environment and is validated once at startup by
`src/config.ts`. See `.env.example` for the full list. Invalid configuration
aborts the boot with a readable error — the service never runs misconfigured.

## Container

```bash
docker build -t ghcr.io/aircloud/template-backend-typescript:local .
docker run --rm -p 3000:3000 ghcr.io/aircloud/template-backend-typescript:local
```

The image is multi-stage, runs as a non-root distroless user, is read-only
rootfs friendly, and ships a `HEALTHCHECK` that reuses the server binary
(`--healthcheck`) so no shell or curl is needed in the final image.

## Supply-chain security

This template ships, out of the box: SHA-pinned GitHub Actions,
`step-security/harden-runner`, least-privilege workflow permissions, GitHub OIDC
for cloud auth (no long-lived secrets), CycloneDX SBOM (syft), **keyless cosign**
image signing, SLSA build-provenance attestation, Trivy scanning, CodeQL,
gitleaks secret scanning, dependency review, OpenSSF Scorecard, Dependabot +
Renovate, and pre-commit hooks. npm packages (if published) use **provenance**
(`npm publish --provenance` via OIDC).

## Releases

Automated with **release-please** and **Conventional Commits**. Merging to
`main` opens/updates a release PR; merging that PR tags a SemVer release and
publishes a signed container image. See `CONTRIBUTING.md`.

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — design + Mermaid diagram + runbooks.
- [`docs/BRANCH-PROTECTION.md`](./docs/BRANCH-PROTECTION.md) — required GitHub Ruleset & status checks.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`SECURITY.md`](./SECURITY.md), [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## License

Apache-2.0 © AirCloud. See [`LICENSE`](./LICENSE).
