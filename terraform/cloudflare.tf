# Cloudflare DNS record for Firebase Hosting custom domain
resource "cloudflare_record" "card_cname" {
  zone_id = var.cloudflare_zone_id
  name    = "card"
  content = "${var.project_id}-card.web.app"
  type    = "CNAME"
  ttl     = 1
  proxied = false
}
