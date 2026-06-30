# Architecture

This document describes the runtime architecture, the request lifecycle, the
CI/CD supply chain, and operational runbooks.

## Overview

A single-process, stateless Fastify v5 HTTP service. State (if any) lives in
external systems; the example uses an in-memory repository you are expected to
replace. The service is designed to be horizontally scalable behind a load
balancer and orchestrated by Kubernetes (liveness/readiness probes included).

## Component diagram

```mermaid
flowchart TD
    client([HTTP client]) -->|request| lb[Load balancer / Ingress]
    lb --> svc

    subgraph svc[Fastify service - src/]
        direction TB
        srv[server.ts<br/>bootstrap + graceful shutdown]
        app[app.ts<br/>buildApp - listen-free]
        srv --> app

        subgraph plugins[Plugins and middleware]
            rid[request-id]
            sec[security-headers]
            rl[rate-limit]
            sens[sensible]
        end

        subgraph routes[Routes]
            health[health: live and ready]
            widgets[v1/widgets CRUD]
        end

        app --> plugins
        app --> routes
        routes -->|Zod schemas| openapi[(OpenAPI 3.1 at /docs)]
        routes -->|errors| err[errors.ts<br/>RFC 9457 Problem Details]
    end

    app --> cfg[config.ts<br/>Zod-validated env]
    app --> log[logger.ts<br/>Pino JSON]
    srv --> otel[telemetry.ts<br/>OpenTelemetry SDK]

    otel -.OTLP/HTTP.-> collector[(OTel Collector)]
    log -.stdout JSON.-> shipper[(Log pipeline)]
```

## Request lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant F as Fastify
    participant V as Zod validator
    participant H as Route handler
    participant E as Error handler

    C->>F: HTTP request
    F->>F: onRequest: assign/echo x-request-id
    F->>V: validate body/query/params (schema)
    alt invalid
        V-->>E: ZodError
        E-->>C: 400 application/problem+json
    else valid
        V->>H: typed, validated input
        H->>H: business logic (repository)
        alt domain error
            H-->>E: NotFoundError / ConflictError
            E-->>C: 4xx Problem Details
        else success
            H-->>F: serialize via response schema
            F->>F: onSend: security headers
            F-->>C: 2xx JSON
        end
    end
```

## Supply chain (CI/CD)

```mermaid
flowchart LR
    pr[Pull request] --> ci[ci.yml<br/>lint, typecheck, test+cov]
    pr --> codeql[CodeQL]
    pr --> trivy[Trivy fs]
    pr --> depr[dependency-review]
    pr --> leaks[gitleaks]

    merge[Merge to main] --> rp[release-please]
    rp -->|release PR merged| tag[SemVer tag]
    tag --> build[container.yml<br/>buildx + SBOM]
    build --> sign[cosign keyless sign]
    build --> prov[SLSA build provenance attestation]
    sign --> ghcr[(ghcr.io/aircloud)]
    prov --> ghcr
```

## Key design decisions

- **Schema-first**: Zod schemas are the single source of truth for validation,
  TypeScript types, and the OpenAPI document. No drift between code and docs.
- **`buildApp()` is listen-free** so integration tests run in-process via
  `app.inject()` — fast, deterministic, no port contention.
- **Fail-fast config**: invalid environment aborts boot. No partial startup.
- **Problem Details everywhere**: one consistent, machine-readable error shape.
- **Distroless + non-root + read-only-rootfs friendly**: minimal attack surface.
- **No long-lived secrets**: OIDC for cloud, keyless cosign for signing.

---

## Runbook: service is unhealthy / failing readiness

**Symptoms:** `/health/ready` returns 503, pods restarting, 5xx spike.

1. **Check liveness vs readiness.** `curl :3000/health/live` (process up) and
   `curl :3000/health/ready` (dependencies). Liveness failing => process/event
   loop issue; readiness failing => downstream dependency.
2. **Inspect logs by request id.** Logs are JSON; filter by `requestId` from the
   client's `x-request-id` header. Look for `level: error/fatal`.
3. **Check traces** in the OTel backend for slow/erroring spans (DB, upstream).
4. **Config drift?** A bad env var fails the boot with a clear message — check
   the container's startup logs for `Invalid environment configuration`.
5. **Rate limiting?** A flood of 429s with `x-ratelimit-*` headers indicates a
   client hammering the API; consider raising `RATE_LIMIT_MAX` or shedding load.
6. **Roll back** to the previous signed image tag if a recent deploy correlates
   with the incident: `kubectl rollout undo deploy/<svc>`. Verify the image
   signature first: `cosign verify ghcr.io/aircloud/<svc>:<tag> ...`.

## Runbook: cutting a release

1. Ensure `main` is green. Merge the open **release-please** PR.
2. That merge creates a SemVer tag; `container.yml` builds, generates an SBOM,
   signs the image (keyless cosign) and attaches SLSA provenance.
3. Verify: `cosign verify --certificate-identity-regexp '...' --certificate-oidc-issuer https://token.actions.githubusercontent.com ghcr.io/aircloud/template-backend-typescript:<tag>`.
4. Promote the tag through environments per your deployment pipeline.

## Runbook: rotating a leaked credential

Long-lived credentials are not used by design. If something is accidentally
committed: `gitleaks` (pre-commit + CI) should block it. If it lands anyway,
invalidate the credential at its source immediately, then purge history with
`git filter-repo` and force-rotate. Open a private security advisory per
`SECURITY.md`.
