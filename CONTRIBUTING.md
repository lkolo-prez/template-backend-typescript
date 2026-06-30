# Contributing

Thanks for contributing to this AirCloud service template. This guide covers the
workflow, quality gates and commit conventions.

## Prerequisites

- Node 22 LTS (`nvm use` reads `.nvmrc`).
- pnpm via Corepack: `corepack enable`.
- Optional but recommended: `pre-commit`, `gitleaks`, `trivy`, `syft`, `task`.

A devcontainer (`.devcontainer/devcontainer.json`) provides all of the above.

## Getting started

```bash
corepack enable
pnpm install
pnpm run prepare      # installs git hooks (husky)
cp .env.example .env
pnpm dev
```

## Development workflow

1. Create a branch off `main`: `git switch -c feat/short-description`.
2. Make your change with tests.
3. Run the local quality gates (CI runs the same):

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test:cov     # must stay >= 80% coverage
   ```

4. If you changed the API surface, regenerate the spec: `pnpm openapi`.
5. Open a pull request and fill in the template.

## Coding standards

- TypeScript `strict`; no `any` (Biome errors on it).
- ESM import specifiers end in `.js` (NodeNext): `import { x } from "./x.js"`.
- Validate all route I/O with Zod; throw the Problem Details errors in
  `src/errors.ts` rather than crafting bespoke error bodies.
- Add new configuration to the Zod schema in `src/config.ts` **and** to
  `.env.example`.
- Formatting is owned by Biome — run `pnpm format`, don't hand-format.

## Commit messages — Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/). The type
drives the automated SemVer bump via release-please.

```
feat(widgets): add bulk import endpoint
fix(config): reject negative PORT values
docs(readme): clarify OTEL setup
chore(deps): bump fastify to 5.2.1
```

Breaking changes: add `!` (`feat!:`) or a `BREAKING CHANGE:` footer.

A commit-msg hook (conventional-pre-commit) and CI both validate this.

## Signed commits (required)

`main` requires **verified (signed) commits**. Configure signing once:

```bash
# SSH signing (simplest):
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

Then add the key as a *Signing key* in GitHub. See
[`docs/BRANCH-PROTECTION.md`](./docs/BRANCH-PROTECTION.md) for the full ruleset.

## Pull requests

- Keep PRs focused and small where possible.
- All required status checks (lint, typecheck, test+coverage, CodeQL, Trivy,
  dependency-review, gitleaks) must pass.
- At least **2 approving reviews** including a CODEOWNER are required.
- Linear history is enforced (rebase/squash, no merge commits, no force-push).

## Releases

Maintainers merge the release-please PR to cut a release. Do not bump versions or
edit the changelog by hand — release-please owns both.

## Reporting security issues

Do **not** open a public issue. Follow [`SECURITY.md`](./SECURITY.md).
