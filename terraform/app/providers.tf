# app: CI（main への push）が apply する stack。Firebase Hosting のサイトとカスタムドメインだけを持つ。
# 認証・IAM・DNS は bootstrap stack（人がローカルで apply）が持つ。
terraform {
  required_version = ">= 1.7"

  # bucket と prefix は backend.hcl で渡す（terraform init -backend-config=backend.hcl）。
  # prefix にはリポジトリ名をフルで含めること（命名ルール gcp-ci-identity-naming）。
  # 過去に "terraform/blog" のような汎用 prefix が別リポジトリの state と衝突し、
  # 本番の SA 権限・WIF Provider・Artifact Registry を壊した事故がある。
  backend "gcs" {}

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.8"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 8.8"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
}
