# GitHub Actions → GCP の鍵なし認証。Pool はこのリポジトリ専用（他リポジトリと共有しない）。
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
  }

  # Pool に入れるのはこのリポジトリのトークンだけ。
  attribute_condition = "assertion.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = var.deployer_sa_id
  display_name = "GitHub Actions deployer (${split("/", var.github_repo)[1]})"
  description  = "main の GitHub Actions が app stack の apply と Hosting への配信に使う"
}

# main ブランチの実行だけがなりすませる。Pool がリポジトリ専用なので ref だけで判定できる。
resource "google_service_account_iam_member" "deployer_wif" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.ref/refs/heads/main"
}

# app stack（Firebase Hosting のサイト・カスタムドメイン）と firebase deploy に要る分だけ。
# IAM・WIF・SA を変える権限は渡さない（それは bootstrap = 人の apply の仕事）。
resource "google_project_iam_member" "deployer" {
  for_each = toset([
    "roles/firebase.viewer",
    "roles/firebasehosting.admin",
    "roles/serviceusage.serviceUsageConsumer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# state バケットは他リポジトリと共有しているので、app stack の state の下だけ読み書きできるようにする。
# 一覧（storage.objects.list）はバケットに対する判定なので、バケット自体も条件に含める。
resource "google_storage_bucket_iam_member" "deployer_app_state" {
  bucket = var.tf_state_bucket
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.deployer.email}"

  condition {
    title       = "app-state-only"
    description = "terraform/01_self-digital-business-card/app/ の下だけ"
    expression  = "resource.name == \"projects/_/buckets/${var.tf_state_bucket}\" || resource.name.startsWith(\"projects/_/buckets/${var.tf_state_bucket}/objects/terraform/01_self-digital-business-card/app/\")"
  }
}
