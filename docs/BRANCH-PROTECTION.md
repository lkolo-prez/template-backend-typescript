# Branch Protection & Repository Ruleset

This repository is protected with a **GitHub Ruleset** (the modern replacement
for classic branch protection) targeting the default branch `main`. Configure it
under **Settings → Rules → Rulesets → New branch ruleset**, or apply the JSON
below via the GitHub API / Terraform.

## Required ruleset for `main`

| Rule                                         | Setting                          |
| -------------------------------------------- | -------------------------------- |
| Require a pull request before merging        | **Yes**                          |
| Required approvals                            | **2**                            |
| Dismiss stale approvals on new commits        | **Yes**                          |
| Require review from **Code Owners**           | **Yes**                          |
| Require approval of the most recent push      | **Yes**                          |
| Require status checks to pass                 | **Yes** (see list below)         |
| Require branches to be up to date before merge| **Yes**                          |
| Require **signed commits**                    | **Yes**                          |
| Require **linear history**                    | **Yes** (squash or rebase merge) |
| Block force pushes                            | **Yes**                          |
| Restrict deletions                            | **Yes**                          |
| Require conversation resolution before merge  | **Yes**                          |

> Do not allow administrators to bypass these rules in production repos.

## Required status checks

The check names must match the workflow **job names** in `.github/workflows/`.
Set these as required:

- `lint`
- `typecheck`
- `test` (includes the 80% coverage gate)
- `build`
- `CodeQL`
- `Trivy`
- `dependency-review`
- `gitleaks`
- `Analyze (javascript-typescript)` — emitted by CodeQL

## Signed (verified) commits — setup

`main` rejects unsigned commits. Configure SSH commit signing once:

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

Add the same public key to GitHub as a **Signing key** (Settings → SSH and GPG
keys). GPG signing is also supported if you prefer it.

## Example ruleset (API / `gh` JSON)

```json
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    { "type": "required_signatures" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 2,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "lint" },
          { "context": "typecheck" },
          { "context": "test" },
          { "context": "build" },
          { "context": "Trivy" },
          { "context": "dependency-review" },
          { "context": "gitleaks" },
          { "context": "Analyze (javascript-typescript)" }
        ]
      }
    }
  ]
}
```

Apply with:

```bash
gh api -X POST repos/aircloud/template-backend-typescript/rulesets \
  --input ruleset.json
```

## Tag protection

Protect release tags (`v*`) so only the release automation can create/update
them. Add a **tag ruleset** restricting creation to the `release-please[bot]` or
the org's release app, and block tag deletion.
