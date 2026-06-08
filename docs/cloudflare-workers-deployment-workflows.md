# Cloudflare Workers Deployment Workflows

## Overview
This PRD defines the GitHub-based delivery model for the `ai-calculator` web application so that:
- every pull request runs visible CI checks,
- pull requests can be deployed to a preview environment under `git-ref.calc.delasy.com`,
- the `main` branch deploys to `calc.delasy.com`,
- preview environments are removed when the related pull request is closed,
- and all application deployments occur only through GitHub workflows.

The application is an existing Next.js 16 + pnpm + TypeScript project. Hosting must use Cloudflare as a static application on Cloudflare Workers.

The intended outcome is a predictable release flow where contributors can validate changes in CI, reviewers can inspect branch previews before merge, and production releases are automated from `main` without any manual deploy path outside GitHub Actions.

## Personas
### Repository Maintainer
A developer or owner responsible for configuring repository automation, reviewing workflow runs, and managing release reliability.

### Pull Request Reviewer
A reviewer or QA collaborator who needs to confirm that CI passes and inspect the proposed changes in a live preview before approving.

### Release Owner
A person accountable for the production site who needs confidence that `main` is the only source of production deployments and that production is updated automatically after merge.

## User Stories
### 1. Pull request CI validation
As a pull request reviewer, I want every pull request to run the full validation suite so that I can see whether the change is safe to merge.

#### Acceptance criteria
- A GitHub Actions CI workflow runs on pull request open, reopen, and synchronize events.
- The CI workflow executes the project standard checks: `type-check`, `lint`, `build`, and `test`.
- Each check result is visible from the pull request in GitHub.
- A failed check marks the workflow as failed and makes the failure visible to the reviewer.
- A successful run clearly shows that all configured checks passed.

### 2. Pull request preview deployment
As a pull request reviewer, I want each pull request branch to have a stable preview URL so that I can review the behavior of the proposed change in a hosted environment.

#### Acceptance criteria
- When a pull request is opened, reopened, or synchronized, GitHub workflows can deploy the pull request build to Cloudflare Workers hosting.
- The preview URL uses a branch-specific subdomain under `git-ref.calc.delasy.com`.
- The preview hostname is derived deterministically from the source branch name using a DNS-safe transformation.
- The preview URL remains stable for the same branch across subsequent commits and updates to that pull request.
- The preview deployment serves the built static application for the branch under review.
- The preview environment is isolated from the production deployment at `calc.delasy.com`.

### 3. Pull request deployment visibility
As a pull request reviewer, I want the preview deployment outcome surfaced in GitHub so that I can quickly access the live preview and know whether deployment succeeded.

#### Acceptance criteria
- The preview deployment workflow publishes a clear success or failure status back to the pull request.
- On success, the pull request shows the preview URL for the deployed branch environment.
- On failure, the workflow exposes enough information in GitHub Actions logs for a maintainer to diagnose the issue.
- Reviewers do not need Cloudflare dashboard access to discover the preview URL.

### 4. Production deployment from main
As a release owner, I want the `main` branch to deploy automatically to `calc.delasy.com` so that production releases happen in a consistent and auditable way.

#### Acceptance criteria
- A GitHub Actions deployment workflow runs for the `main` branch.
- The `main` branch deployment targets `calc.delasy.com` on Cloudflare Workers static hosting.
- The production deployment uses the repository source from `main` and does not require a manual local deploy step.
- Production deployment results are visible in GitHub Actions history.
- Production remains separate from preview environments and is not overwritten by pull request preview deployments.

### 5. Preview environment deprovisioning
As a repository maintainer, I want preview environments removed when a pull request is closed so that stale preview environments do not accumulate.

#### Acceptance criteria
- When a pull request is closed, GitHub workflows trigger preview cleanup for the related branch preview environment.
- The cleanup behavior applies whether the pull request was merged or closed without merge.
- After cleanup completes, the closed pull request preview environment is no longer considered active.
- Cleanup is safe to run even if the preview environment was already missing or had already been removed.
- Cleanup activity is logged in GitHub Actions so maintainers can confirm it ran.

### 6. Workflow-only deployment governance
As a release owner, I want deployments to be managed exclusively through GitHub workflows so that releases are controlled, reproducible, and auditable.

#### Acceptance criteria
- The deployment process for both preview and production environments is defined in repository-hosted GitHub workflow files.
- Cloudflare credentials and identifiers required by the workflows are supplied through GitHub-managed secrets or variables rather than manual command execution on contributor machines.
- The expected repository-side deployment configuration is stored in version-controlled project files.
- The intended operational path for application deployments is GitHub Actions, not ad hoc manual deploy commands.

## Open Questions
None at this time.

## Out of Scope
- Initial Cloudflare account creation, billing setup, or domain ownership verification outside the repository.
- Non-GitHub CI/CD platforms.
- Runtime feature changes to the calculator application itself.
- Analytics, observability, or alerting beyond standard GitHub Actions logging.
- Branch protection policy decisions, reviewer assignment rules, or GitHub organization administration unrelated to the workflows.
- Multi-environment release stages beyond pull request previews and production.

## Assumptions
- The `delasy.com` zone is already managed in Cloudflare and can host both `calc.delasy.com` and preview hostnames under `git-ref.calc.delasy.com`.
- The implementation will use Cloudflare Workers static hosting rather than Cloudflare Pages.
- GitHub Actions is the only approved deployment execution path for application releases.
- Branch-derived preview hostnames may need DNS-safe slugification of branch names; the preview URL should stay deterministic for a given branch.
- Preview deployments are expected for pull requests originating from branches that can safely access the required GitHub Actions secrets and Cloudflare credentials.
- Production deployment is expected to occur from updates to `main`, typically after merge of reviewed pull requests.
- The existing project build remains compatible with a static deployment target on Cloudflare Workers.