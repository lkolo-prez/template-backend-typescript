# Security Policy

We take the security of AirCloud software seriously. Thank you for helping keep
our users and infrastructure safe.

## Supported versions

| Version            | Supported          |
| ------------------ | ------------------ |
| `main` (latest)    | :white_check_mark: |
| Latest minor tag   | :white_check_mark: |
| Older              | :x:                |

This is a template; downstream services should adapt this table to their own
release cadence.

## Reporting a vulnerability

**Please do not open public GitHub issues for security problems.**

Use **private vulnerability reporting** instead:

1. Preferred: GitHub → this repo → **Security** tab → **Report a vulnerability**
   (GitHub Private Vulnerability Reporting). This creates a private advisory.
2. Alternatively, email **security@aircloud.com.pl**. Encrypt sensitive details
   with our PGP key referenced in `security.txt` (see below).

Please include: affected version/commit, a description, reproduction steps or a
proof of concept, and any suggested remediation.

### security.txt

Our machine-readable security contact follows
[RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) and is published at:

```
https://aircloud.com.pl/.well-known/security.txt
```

## Response SLA

| Stage                         | Target                       |
| ----------------------------- | ---------------------------- |
| Acknowledge receipt           | within **2 business days**   |
| Initial assessment / triage   | within **5 business days**   |
| Fix or mitigation plan        | within **30 days** (severity-dependent) |
| Coordinated public disclosure | by mutual agreement, default **90 days** |

We will keep you informed throughout and credit you in the advisory unless you
prefer to remain anonymous.

## Scope

In scope: source code, build/release pipeline, container image, and default
configuration in this repository. Out of scope: issues that require a
compromised developer machine, social engineering, or third-party services we do
not control.

## Our supply-chain controls

This project enforces SHA-pinned GitHub Actions, hardened runners, least-
privilege workflow permissions, OIDC-based keyless auth and cosign signing, SBOM
generation, Trivy/CodeQL/gitleaks scanning, dependency review, and OpenSSF
Scorecard. See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and the workflows
in `.github/workflows/`.

## Safe harbor

We will not pursue or support legal action against researchers who act in good
faith, avoid privacy violations and service disruption, and give us reasonable
time to remediate before disclosure.
