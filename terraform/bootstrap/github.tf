# CI が読む値。秘密ではないので Secrets ではなく Variables に置く（CI は Secrets を持たない）。
locals {
  actions_variables = {
    GCP_PROJECT_ID      = var.project_id
    GCP_WIF_PROVIDER    = google_iam_workload_identity_pool_provider.github_actions.name
    GCP_SA_EMAIL        = google_service_account.deployer.email
    GCP_TF_STATE_BUCKET = var.tf_state_bucket
  }
}

resource "github_actions_variable" "ci" {
  for_each = local.actions_variables

  repository    = split("/", var.github_repo)[1]
  variable_name = each.key
  value         = each.value
}
