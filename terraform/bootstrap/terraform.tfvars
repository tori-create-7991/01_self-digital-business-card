# 秘密は含まない（トークンは環境変数で渡す）。フォークしたら自分の値に書き換える。
project_id      = "tori-develop"
github_repo     = "tori-create-7991/01_self-digital-business-card"
tf_state_bucket = "tori-develop-tfstate"

# terraform/app/backend.hcl の prefix と同じ値
app_state_prefix = "terraform/01_self-digital-business-card/app"

enable_cloudflare    = true
cloudflare_zone_name = "tori-dev.com"
custom_domain        = "card.tori-dev.com"
