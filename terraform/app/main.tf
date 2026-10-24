# Firebase をプロジェクトで有効にする（API の有効化は bootstrap stack が持つ）
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id
}

output "hosting_site_url" {
  value       = "https://${var.project_id}.web.app"
  description = "The default Firebase Hosting URL"
}
