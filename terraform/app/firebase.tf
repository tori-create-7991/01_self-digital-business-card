# card 用の Hosting サイト
resource "google_firebase_hosting_site" "card" {
  provider = google-beta
  project  = var.project_id
  site_id  = "${var.project_id}-card"

  depends_on = [google_firebase_project.default]
}

# カスタムドメイン（DNS レコードは bootstrap stack が作る）
resource "google_firebase_hosting_custom_domain" "card" {
  count = var.custom_domain == "" ? 0 : 1

  provider      = google-beta
  project       = var.project_id
  site_id       = google_firebase_hosting_site.card.site_id
  custom_domain = var.custom_domain

  wait_dns_verification = false
}

output "card_site_id" {
  value       = google_firebase_hosting_site.card.site_id
  description = "Site ID for card subdomain"
}

output "card_url" {
  value       = var.custom_domain == "" ? "https://${google_firebase_hosting_site.card.site_id}.web.app" : "https://${var.custom_domain}"
  description = "Card site URL"
}
