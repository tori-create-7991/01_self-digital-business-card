# bootstrap: 人がローカルで apply する stack。
# CI の認証（WIF Pool・Provider・SA・IAM）、GitHub の Actions Variables、DNS を持つ。
# CI はこの stack を触らない（state も読み書きできない）。
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
