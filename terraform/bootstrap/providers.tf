# bootstrap: 人がローカルで apply する stack。
# CI の認証（WIF Pool・Provider・SA・IAM）、GitHub の Actions Variables、DNS を持つ。
# CI はこの stack を触らない（state も読み書きできない）。
terraform {
  required_version = ">= 1.7"

  # bucket は init 時に -backend-config="bucket=<project>-tfstate" で渡す。
  # prefix はリポジトリ名をフルで含める（汎用 prefix の衝突で他リポジトリの
  # 本番 IAM を壊した事故がある）。フォークしたらリポジトリ名に合わせて書き換える。
  backend "gcs" {
    prefix = "terraform/01_self-digital-business-card/bootstrap"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.8"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.28"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 認証は環境変数 GITHUB_TOKEN（例: GITHUB_TOKEN=$(gh auth token)）。
provider "github" {
  owner = local.github_owner
}

# 認証は環境変数 CLOUDFLARE_API_TOKEN。enable_cloudflare = false なら不要。
provider "cloudflare" {}
