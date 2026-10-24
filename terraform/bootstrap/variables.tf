variable "project_id" {
  description = "GCP プロジェクト ID"
  type        = string
}

variable "region" {
  description = "既定のリージョン"
  type        = string
  default     = "us-central1"
}

variable "github_repo" {
  description = "GitHub リポジトリ（owner/repo）。WIF の信頼条件と Actions Variables の書き込み先"
  type        = string

  validation {
    condition     = can(regex("^[^/]+/[^/]+$", var.github_repo))
    error_message = "github_repo は owner/repo の形で指定する。"
  }
}

variable "tf_state_bucket" {
  description = "Terraform state を置く GCS バケット（既存。この stack では作らない・管理しない）"
  type        = string
}

# 名前は 00_my_env の命名ルール（gcp-ci-identity-naming）に従う。
# <slug> = リポジトリ名を小文字・ハイフンにしたもの。32/30 文字を超えるので先頭の 01_ を落としている。
variable "wif_pool_id" {
  description = "WIF Pool ID（<slug>-pool、4〜32 文字）"
  type        = string
  default     = "self-digital-business-card-pool"
}

variable "deployer_sa_id" {
  description = "CI が使う SA の account_id（gha-<slug>、6〜30 文字）"
  type        = string
  default     = "gha-self-digital-business-card"
}

variable "enable_cloudflare" {
  description = "Cloudflare で独自ドメインの DNS レコードを管理するか。false なら *.web.app だけで配信"
  type        = bool
  default     = false
}

variable "cloudflare_zone_name" {
  description = "Cloudflare のゾーン名（例: example.com。enable_cloudflare = true のとき必須）"
  type        = string
  default     = ""
}

variable "custom_domain" {
  description = "独自ドメイン（enable_cloudflare = true のとき CNAME を作る）"
  type        = string
  default     = ""
}
