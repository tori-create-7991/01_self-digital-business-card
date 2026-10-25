# Ryo.Tonegawa Profile Site (Bento Style)

This repository contains the source code for a personal profile site using **Vite + Vanilla HTML/CSS**, hosted on **Firebase Hosting**, and provisioned via **Terraform** and **GitHub Actions**.

## Architecture
- **Frontend**: Standard HTML/CSS with Vite (for building). No heavy frameworks. `npm run build` first generates `src/index.html` from `src/config.ts`.
- **Hosting**: Firebase Hosting on Google Cloud.
- **IaC**: Terraform, split into two stacks:
  - `terraform/bootstrap/` — applied **by a person, locally**. CI identity (Workload Identity Federation pool/provider, service account, IAM), GitHub Actions Variables, and the Cloudflare DNS record (optional).
  - `terraform/app/` — applied **by GitHub Actions** on every push to `main`. Firebase project, Hosting site, custom domain.
- **CI/CD**: GitHub Actions.
  - `build.yml` — every PR: unit tests and build (required check `build`).
  - `terraform.yml` — PR: fmt/validate and `plan` of the app stack, commented on the PR (required check `plan`). `main`: `apply`. Weekly: drift check.
  - `deploy.yml` — after a successful `apply` on `main`: build and `firebase deploy`, then check the site returns 200.
  - `main` is protected by a ruleset (PR required, `build` and `plan` must pass; admins can bypass, e.g. for Dependabot PRs touching `terraform/`, after checking `plan` locally).
  - Actions are pinned to commit SHAs and updated weekly by Dependabot together with npm and Terraform providers. `firebase-tools` is pinned in `devDependencies`.
- **Security**: keyless auth (WIF). The pool is dedicated to this repository. Two service accounts: `deployer` can only be used by jobs on `main` with the `production` Environment; `planner` is read-only. CI holds **no secrets** (Actions Variables only). Neither account can change IAM, WIF, or DNS, and they can only read (planner) or read/write (deployer) the app stack's state. Firebase Hosting roles are project-wide, so if the project hosts other sites, the deployer can deploy to them too (accepted: only `main` production jobs of this repository can use it).

Names follow one rule: pool `<repo-slug>-pool`, provider `github-actions`, service accounts `gha-<slug>-<role>` (here `business-card`, shortened to fit 30 characters), state prefix `terraform/<repo-name>/{bootstrap,app}` (the full repository name, never a generic prefix such as `terraform/state`).

## Prerequisites
- A GCP project with billing, and permission to edit IAM / Workload Identity Federation.
- A GitHub account (`gh auth login`).
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install), [Terraform](https://developer.hashicorp.com/terraform/install) 1.7+ and Node.js 22.
- Optional: a Cloudflare zone for a custom domain, and an API token with `Zone:Read` + `DNS:Edit` on that zone.

## Setup (from scratch, e.g. after forking)

1. Edit `terraform/*/terraform.tfvars` and `terraform/*/backend.hcl` for your project and repository (the state prefix must contain your repository name; keep `app_state_prefix` in bootstrap equal to the app `backend.hcl` prefix). Shorten `sa_slug` if `gha-<sa_slug>-deployer` exceeds 30 characters. Set `enable_cloudflare = false` (bootstrap) and `custom_domain = ""` (app) if you do not use a custom domain.
2. Create the state bucket once (Terraform cannot create its own backend):
   ```bash
   gcloud auth login && gcloud auth application-default login
   gcloud storage buckets create "gs://YOUR_PROJECT-tfstate" --project=YOUR_PROJECT --location=us-central1 --uniform-bucket-level-access
   gcloud storage buckets update "gs://YOUR_PROJECT-tfstate" --versioning
   ```
3. Apply bootstrap locally:
   ```bash
   export GITHUB_TOKEN=$(gh auth token)
   export CLOUDFLARE_API_TOKEN=...   # only when enable_cloudflare = true
   terraform -chdir=terraform/bootstrap init -backend-config=backend.hcl
   terraform -chdir=terraform/bootstrap apply
   ```
   This writes the Actions Variables (`GCP_PROJECT_ID`, `WIF_PROVIDER`, `DEPLOYER_SA`, `PLANNER_SA`, `TF_STATE_BUCKET`, `TF_STATE_PREFIX_APP`, `PROD_SITE_ID`, `PROD_SITE_URL`), the `production` Environment and the `main` ruleset. No Secrets are needed.
4. Open a PR and merge it into `main`. Actions applies the app stack, then builds and deploys.

### Terraform changes from Dependabot or forks
Those PRs cannot authenticate to GCP, so `plan` fails when they touch `terraform/`. Run `terraform -chdir=terraform/app init -backend-config=backend.hcl && terraform -chdir=terraform/app plan` locally, then merge as an admin.

Re-run step 3 whenever you change anything under `terraform/bootstrap/`. CI never applies it.

Migrating this repository from the old single stack is described in [docs/runbook/two-stage-migration.md](docs/runbook/two-stage-migration.md).

## Local Development
To run the site locally:
```bash
npm install
npm run dev
```
Open `http://localhost:5173` to view.
