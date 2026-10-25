# GitHub Actions → GCP の鍵なし認証。Pool はこのリポジトリ専用（他リポジトリと共有しない）。
# 命名ルール（gcp-ci-identity-naming）: Pool は <slug>-pool、Provider は github-actions。
# Pool がこのリポジトリ専用なので、SA のなりすまし条件を Environment・ブランチだけで安全に絞れる。
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = var.wif_pool_id
  display_name              = "GitHub Actions"
  description               = "GitHub Actions of ${var.github_repo} only"

  depends_on = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "GitHub Actions OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
    "attribute.event_name" = "assertion.event_name"
    # deployer の判定用。Environment とブランチの組み合わせ（例 production@refs/heads/main）。
    # Environment を指定しないジョブのトークンには environment クレームが無いので、空ではなく none を入れる。
    "attribute.deploy_ctx" = "(has(assertion.environment) ? assertion.environment : \"none\") + \"@\" + assertion.ref"
    "attribute.actor"      = "assertion.actor"
  }

  # Pool に入れるのはこのリポジトリのトークンだけ。
  attribute_condition = "assertion.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

locals {
  pool_principal = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}"
}
