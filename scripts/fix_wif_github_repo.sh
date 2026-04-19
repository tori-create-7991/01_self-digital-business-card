#!/usr/bin/env bash
# Fix GitHub Actions → GCP auth after the repository was renamed or transferred.
#
# Symptom in Actions: google-github-actions/auth fails with
#   unauthorized_client / "The given credential is rejected by the attribute condition."
#
# Prerequisites:
#   - gcloud installed and logged in (e.g. `gcloud auth application-default login`)
#   - Permission to edit Workload Identity Federation and the github-actions-tf SA
#
# Usage:
#   export GCP_PROJECT_ID="your-project-id"
#   export GITHUB_REPO="owner/repo"   # must match github.repository in Actions
#   ./scripts/fix_wif_github_repo.sh
#
# Optional: remove the old repo binding after a rename (recommended once the new one works):
#   gcloud iam service-accounts get-iam-policy "github-actions-tf@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
#     --project="$GCP_PROJECT_ID" --format=json
#   # then remove the stale principalSet .../attribute.repository/OLD_OWNER/OLD_REPO binding

set -euo pipefail

POOL_ID="${WIF_POOL_ID:-github-pool}"
PROVIDER_ID="${WIF_PROVIDER_ID:-github-provider}"
SA_NAME="${GITHUB_ACTIONS_SA_NAME:-github-actions-tf}"
LOCATION="${WIF_LOCATION:-global}"

if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
  read -r -p "GCP project ID: " GCP_PROJECT_ID
fi

if [[ -z "${GITHUB_REPO:-}" ]]; then
  read -r -p "GitHub repository (owner/repo): " GITHUB_REPO
fi

# Normalize repo: allow full clone URL
GITHUB_REPO="${GITHUB_REPO#https://github.com/}"
GITHUB_REPO="${GITHUB_REPO#git@github.com:}"
GITHUB_REPO="${GITHUB_REPO%.git}"

SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
CONDITION="assertion.repository == '${GITHUB_REPO}'"

echo "Project:     $GCP_PROJECT_ID"
echo "Repository:  $GITHUB_REPO"
echo "Updating WIF OIDC provider ${PROVIDER_ID} attribute condition..."

gcloud config set project "$GCP_PROJECT_ID" >/dev/null

gcloud iam workload-identity-pools providers update-oidc "$PROVIDER_ID" \
  --workload-identity-pool="$POOL_ID" \
  --location="$LOCATION" \
  --project="$GCP_PROJECT_ID" \
  --attribute-condition="$CONDITION"

WIF_POOL_NAME="$(gcloud iam workload-identity-pools describe "$POOL_ID" \
  --location="$LOCATION" \
  --project="$GCP_PROJECT_ID" \
  --format='value(name)')"

PRINCIPAL="principalSet://iam.googleapis.com/${WIF_POOL_NAME}/attribute.repository/${GITHUB_REPO}"

echo "Ensuring service account impersonation for: $PRINCIPAL"
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$GCP_PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="$PRINCIPAL" \
  --condition=None \
  --quiet

echo ""
echo "Done. Re-run the failed GitHub Actions job (Deploy to Firebase Hosting)."
echo "If the repo was renamed, remove the IAM binding for the OLD owner/repo on $SA_EMAIL if it still exists."
