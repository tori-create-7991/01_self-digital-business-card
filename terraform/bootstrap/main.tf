locals {
  github_owner = split("/", var.github_repo)[0]
  repo_name    = split("/", var.github_repo)[1]

  # Firebase Hosting のサイト ID（app stack と同じ規則）
  card_site_id = "${var.project_id}-card"

  apis = toset([
    "cloudresourcemanager.googleapis.com",
    "firebase.googleapis.com",
    "firebasehosting.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "serviceusage.googleapis.com",
    "storage.googleapis.com",
    "sts.googleapis.com",
  ])
}

# 有効化済みの API に対しても create は何もせず state に載るだけなので import は要らない。
resource "google_project_service" "apis" {
  for_each = local.apis

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}
