variable "project_id" {
  description = "GCP プロジェクト ID"
  type        = string
}

variable "region" {
  description = "既定のリージョン"
  type        = string
  default     = "us-central1"
}

variable "custom_domain" {
  description = "Firebase Hosting に紐づける独自ドメイン。空なら *.web.app だけで配信"
  type        = string
  default     = ""
}
