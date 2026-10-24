# Ryo.Tonegawa Profile Site (Bento Style)

This repository contains the source code for a personal profile site using **Vite + Vanilla HTML/CSS**, hosted on **Firebase Hosting**, and provisioned via **Terraform** and **GitHub Actions**.

## Architecture
- **Frontend**: Standard HTML/CSS with Vite (for building). No heavy frameworks. `npm run build` first generates `src/index.html` from `src/config.ts`.
- **Hosting**: Firebase Hosting on Google Cloud.
- **IaC**: Terraform, split into two stacks:
  - `terraform/bootstrap/` — applied **by a person, locally**. CI identity (Workload Identity Federation pool/provider, service account, IAM), GitHub Actions Variables, and the Cloudflare DNS record (optional).
  - `terraform/app/` — applied **by GitHub Actions** on every push to `main`. Firebase project, Hosting site, custom domain.
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`): `terraform apply` (app) → build → `firebase deploy`.
- **Security**: keyless auth (WIF). The pool is dedicated to this repository and only `refs/heads/main` can impersonate the service account. CI holds **no secrets** (Actions Variables only), and its service account cannot change IAM, WIF, or DNS, and can only read/write the app stack's state. Firebase Hosting roles are project-wide, so if the project hosts other sites, this service account can deploy to them too (accepted: only `main` of this repository can use it).

Names follow one rule: pool `<repo-slug>-pool`, provider `github-actions`, service account `gha-<repo-slug>`, state prefix `terraform/<repo-name>/{bootstrap,app}` (the full repository name, never a generic prefix such as `terraform/state`).

## Prerequisites
- A GCP project with billing, and permission to edit IAM / Workload Identity Federation.
- A GitHub account (`gh auth login`).
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install), [Terraform](https://developer.hashicorp.com/terraform/install) 1.7+ and Node.js 22.
- Optional: a Cloudflare zone for a custom domain, and an API token with `Zone:Read` + `DNS:Edit` on that zone.

## Setup (from scratch, e.g. after forking)

1. Edit `terraform/bootstrap/terraform.tfvars` and `terraform/app/terraform.tfvars` for your project and repository. If you renamed the repository, also change the `prefix` in both `providers.tf` files to your repository name. Set `enable_cloudflare = false` (bootstrap) and `custom_domain = ""` (app) if you do not use a custom domain.
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
   terraform -chdir=terraform/bootstrap init -backend-config="bucket=YOUR_PROJECT-tfstate"
   terraform -chdir=terraform/bootstrap apply
   ```
   This writes the Actions Variables `GCP_PROJECT_ID`, `GCP_WIF_PROVIDER`, `GCP_SA_EMAIL`, `GCP_TF_STATE_BUCKET`. No Secrets are needed.
4. Push to `main` (or run the workflow manually on `main`). Actions applies the app stack, builds, and deploys.

Re-run step 3 whenever you change anything under `terraform/bootstrap/`. CI never applies it.

Migrating this repository from the old single stack is described in [docs/runbook/two-stage-migration.md](docs/runbook/two-stage-migration.md).

## Local Development
To run the site locally:
```bash
npm install
npm run dev
```
Open `http://localhost:5173` to view.
