# 独自ドメインの CNAME。Cloudflare のトークンは CI に渡さないので、DNS は bootstrap（人の apply）が持つ。
data "cloudflare_zone" "site" {
  count = var.enable_cloudflare ? 1 : 0

  filter = {
    name = var.cloudflare_zone_name
  }
}

resource "cloudflare_dns_record" "card" {
  count = var.enable_cloudflare ? 1 : 0

  zone_id = data.cloudflare_zone.site[0].zone_id
  name    = var.custom_domain
  type    = "CNAME"
  content = "${local.card_site_id}.web.app"
  ttl     = 1
  proxied = false

  lifecycle {
    precondition {
      condition     = var.cloudflare_zone_name != "" && var.custom_domain != ""
      error_message = "enable_cloudflare = true のときは cloudflare_zone_name と custom_domain を指定する。"
    }
  }
}
