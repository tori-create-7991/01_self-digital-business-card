# CI 用の SA。役割ごとに分け、それぞれ必要な権限だけを持つ。
# 命名ルール: gha-<slug>-<役割>。<slug>（self-digital-business-card）のままだと 30 文字を超えるので
# business-card に略している（01_self-digital-business-card 用）。
#
#   deployer  main ブランチ上の Environment production のジョブだけ。app の apply と本番配信
#   planner   Pool 内の全員（= このリポジトリの全ワークフロー）。読み取りだけ（PR の plan・週 1 回のズレ検知）
#
# Hosting の権限はプロジェクト単位でしか付けられないため、deployer は同じプロジェクトの
# 他の Hosting サイトにも配信できてしまう。使えるのが main の production ジョブだけなので許容する。
resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = "gha-${var.sa_slug}-deployer"
  display_name = "GitHub Actions deployer (${local.repo_name})"
  description  = "main ブランチの CI。app stack の apply と本番配信"

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "planner" {
  project      = var.project_id
  account_id   = "gha-${var.sa_slug}-planner"
  display_name = "GitHub Actions planner (${local.repo_name})"
  description  = "PR の plan と週 1 回のズレ検知。読み取りだけ"

  depends_on = [google_project_service.apis]
}

# deployer は「Environment production を指定した、main ブランチ上のジョブ」だけ。
# Environment とブランチの両方を見るので、GitHub 側の Environment のブランチ制限が外れても main 以外からは使えず、
# main 上でも Environment を指定しない workflow からは使えない。
resource "google_service_account_iam_member" "deployer_wif" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "${local.pool_principal}/attribute.deploy_ctx/production@refs/heads/main"
}

resource "google_service_account_iam_member" "planner_wif" {
  service_account_id = google_service_account.planner.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "${local.pool_principal}/*"
}

# プロジェクト単位の権限。IAM・WIF・SA を変える権限はどちらにも渡さない（それは bootstrap = 人の apply の仕事）。
locals {
  project_roles = {
    deployer = [
      "roles/firebase.viewer",
      "roles/firebasehosting.admin",
      "roles/serviceusage.serviceUsageConsumer",
    ]
    planner = [
      "roles/viewer",
      "roles/serviceusage.serviceUsageConsumer",
    ]
  }
  sa_emails = {
    deployer = google_service_account.deployer.email
    planner  = google_service_account.planner.email
  }
  project_role_bindings = merge([
    for sa, roles in local.project_roles : {
      for role in roles : "${sa}/${role}" => { sa = sa, role = role }
    }
  ]...)
}

resource "google_project_iam_member" "ci" {
  for_each = local.project_role_bindings

  project = var.project_id
  role    = each.value.role
  member  = "serviceAccount:${local.sa_emails[each.value.sa]}"
}

# state バケットは他リポジトリと共有しているので、app stack の state の下だけに絞る。
# 一覧（storage.objects.list）はバケットに対する判定なので、一覧の prefix で絞る（他リポジトリの state 名も見せない）。
locals {
  bucket_resource    = "projects/_/buckets/${var.tf_state_bucket}"
  app_state_dir      = "${var.app_state_prefix}/"
  app_state_cel_expr = "(resource.name == \"${local.bucket_resource}\" && api.getAttribute(\"storage.googleapis.com/objectListPrefix\", \"\").startsWith(\"${local.app_state_dir}\")) || resource.name.startsWith(\"${local.bucket_resource}/objects/${local.app_state_dir}\")"
}

# deployer は app stack の state を読み書きする（apply とロック）。
resource "google_storage_bucket_iam_member" "deployer_state" {
  bucket = var.tf_state_bucket
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.deployer.email}"

  condition {
    title       = "app-state-only"
    description = "app stack の state の下だけ"
    expression  = local.app_state_cel_expr
  }
}

# planner は読むだけ。plan は -lock=false で実行する（ロックファイルを書けないため）。
resource "google_storage_bucket_iam_member" "planner_state" {
  bucket = var.tf_state_bucket
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.planner.email}"

  condition {
    title       = "app-state-only"
    description = "app stack の state の下だけ（読み取り）"
    expression  = local.app_state_cel_expr
  }
}
