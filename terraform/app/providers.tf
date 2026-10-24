# app: CI（main への push）が apply する stack。Firebase Hosting のサイトとカスタムドメインだけを持つ。
# 認証・IAM・DNS は bootstrap stack（人がローカルで apply）が持つ。
terraform {
  required_version = ">= 1.7"

  # bucket は init 時に -backend-config="bucket=<project>-tfstate" で渡す。
  # prefix はリポジトリ名をフルで含める（汎用 prefix の衝突で他リポジトリの
  # 本番 IAM を壊した事故がある）。フォークしたらリポジトリ名に合わせて書き換える。
  # CI の SA はこの prefix の下しか読み書きできない（bootstrap/wif.tf の条件付き IAM）。
  backend "gcs" {
    prefix = "terraform/01_self-digital-business-card/app"
  }

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
