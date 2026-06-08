# Cloudflare Workers deployment operations

This repository deploys the static Next.js application to Cloudflare Workers only through GitHub Actions. Local real deploys are not part of the approved release path; the package deployment scripts refuse non-dry-run deploys outside GitHub Actions and exist so workflows can reuse the same commands.

## Workflows

- `.github/workflows/ci.yml` runs on pull request `opened`, `reopened`, and `synchronize` events. It exposes separate `type-check`, `lint`, `build`, `test`, and `test:static` checks in GitHub.
- `.github/workflows/deploy-preview.yml` runs on pull request `opened`, `reopened`, and `synchronize` events for branches in this repository. It derives preview metadata from trusted default-branch workflow code, validates/builds/tests the pull request source without Cloudflare secrets, uploads the static `out/` directory as a short-lived artifact, then checks out trusted default-branch deployment code to deploy that artifact to a branch-specific Cloudflare Worker. The workflow comments the preview URL on the pull request and publishes a GitHub deployment environment named `preview/<slug>`.
- `.github/workflows/deploy-production.yml` runs on pushes to `main` and deploys the built static application to `https://calc.delasy.com` as the `production` GitHub environment.
- `.github/workflows/cleanup-preview.yml` runs when a pull request is closed. It deletes the deterministic preview Workers route and Worker script, treats already-missing resources as a successful no-op, and marks matching GitHub preview deployments inactive so the `preview/<slug>` environment is no longer considered active.

Preview deploys and cleanup are skipped for forked pull requests because repository Cloudflare credentials are not available to those runs.

## GitHub secrets and variables

Configure these at the repository or organization level before enabling deployments:

| Name | Type | Used by | Purpose |
| --- | --- | --- | --- |
| `CLOUDFLARE_PREVIEW_API_TOKEN` | Secret | preview, cleanup | Preview-only Cloudflare API token used only by the preview deploy step and cleanup deletion step. It must not have production deployment capability. |
| `CLOUDFLARE_PRODUCTION_API_TOKEN` | Secret | production | Production-only Cloudflare API token used only by the production deploy step. |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | preview, production, cleanup | Cloudflare account containing the Workers scripts. |
| `CLOUDFLARE_ZONE_ID` | Variable | preview, production, cleanup | Cloudflare zone ID for `delasy.com`; used for Workers route governance and cleanup. |

Use separate Cloudflare API tokens for preview and production. Scope each token as narrowly as Cloudflare permits for its target resources: Workers scripts/assets edit access for the relevant Worker(s), Workers routes edit access for the relevant hostnames, and zone read access where route listing is required. The preview token should be limited to preview Workers/routes under `git-ref.calc.delasy.com` and must not be able to deploy or mutate the production `calc.delasy.com` route or Worker.

Optional variables for non-production rehearsals:

| Name | Default | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_PREVIEW_DOMAIN` | `git-ref.calc.delasy.com` | Base domain for pull request preview hosts. |
| `CLOUDFLARE_PREVIEW_WORKER_PREFIX` | `ai-calculator-preview` | Prefix for branch preview Worker names. |

## GitHub Actions supply-chain governance

Third-party GitHub Actions are pinned to full commit SHAs in workflow files, with adjacent comments noting the human-readable upstream major/minor tag that was resolved. Do not replace these pins with mutable tags such as `@v4` alone. When updating an action, verify the upstream tag from the action repository, update the SHA and comment together, review the action release notes, and run the repository validation suite before merging the workflow change.

## Cloudflare prerequisites

- `delasy.com` is managed in Cloudflare.
- `calc.delasy.com` resolves through Cloudflare and can be routed to the production Worker by the `calc.delasy.com/*` Workers route.
- Preview hostnames resolve through Cloudflare, typically through a proxied wildcard DNS record for `*.git-ref.calc.delasy.com`, and can be routed by per-branch Workers routes.
- The production Worker is named `ai-calculator`.
- Preview Workers are named `ai-calculator-preview-<slug>`.

## Static application configuration

`next.config.ts` enables `output: "export"`, so `pnpm run build` emits static assets to `out/`. `wrangler.jsonc` points Cloudflare Workers static assets at that directory. Production and preview workflows pass the target Worker name and route at deploy time so production (`calc.delasy.com/*`) and preview (`<slug>.git-ref.calc.delasy.com/*`) environments cannot overwrite each other.

The deployed application can display build-time deployment metadata from `NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT`, `NEXT_PUBLIC_DEPLOYMENT_URL`, `NEXT_PUBLIC_DEPLOYMENT_REF`, `NEXT_PUBLIC_DEPLOYMENT_SHA`, and `NEXT_PUBLIC_DEPLOYMENT_TARGET`. The GitHub deployment workflows set these values before `pnpm run build`, which renders a small Cloudflare Workers deployment card into the static HTML for preview and production builds. Local builds omit the card when those values are unset.

Run `pnpm run validate:static` after a static build to verify the `out/` directory contains the calculator shell, the `404.html` page expected by Workers asset fallback behavior, compiled `_next/static` assets, and any deployment metadata configured in the build environment. CI exposes this through the `test:static` check, and deployment workflows validate the already-built artifact before calling Wrangler.

## Preview slugging

`scripts/preview-environment.mjs` derives deployment metadata from the pull request source branch. It lowercases the branch name, removes characters that are not DNS-safe, collapses separators to hyphens, and appends an eight-character SHA-256 hash. The hash keeps similarly normalized branch names from colliding while preserving a stable URL for subsequent commits on the same branch.

Example:

```text
feature/cloudflare-workers -> feature-cloudflare-workers-<hash>.git-ref.calc.delasy.com
```

## Cleanup behavior

`scripts/cleanup-preview.mjs` computes the same preview metadata, deletes the matching Workers route from the configured zone, and deletes the matching Worker script from the configured account. Missing routes or Worker scripts are logged and treated as success so the workflow remains safe to rerun. After Cloudflare cleanup succeeds, the cleanup workflow creates an `inactive` status for every GitHub deployment matching the preview environment name.
