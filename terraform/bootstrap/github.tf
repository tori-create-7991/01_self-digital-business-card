# GitHub リポジトリの設定。CI はここで登録した Variables だけを読み、Secrets は使わない。
# 認証はローカルの GITHUB_TOKEN=$(gh auth token)。
locals {
  prod_site_url = var.custom_domain != "" ? "https://${var.custom_domain}" : "https://${local.card_site_id}.web.app"

  actions_variables = {
    GCP_PROJECT_ID      = var.project_id
    WIF_PROVIDER        = google_iam_workload_identity_pool_provider.github_actions.name
    DEPLOYER_SA         = google_service_account.deployer.email
    PLANNER_SA          = google_service_account.planner.email
    TF_STATE_BUCKET     = var.tf_state_bucket
    TF_STATE_PREFIX_APP = var.app_state_prefix
    PROD_SITE_ID        = local.card_site_id
    PROD_SITE_URL       = local.prod_site_url
  }
}

resource "github_actions_variable" "ci" {
  for_each = local.actions_variables

  repository    = local.repo_name
  variable_name = each.key
  value         = each.value
}

# main へのマージ後に動く本番用の Environment。main 以外からは使えない。
resource "github_repository_environment" "production" {
  repository  = local.repo_name
  environment = "production"

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment_deployment_policy" "production_main" {
  repository     = local.repo_name
  environment    = github_repository_environment.production.environment
  branch_pattern = "main"
}

# main の保護。PR 必須、build と plan の成功が必須。
# 管理者は保護を無視してマージできる（フォークや Dependabot の PR では plan が動かないため）。
resource "github_repository_ruleset" "main" {
  name        = "main"
  repository  = local.repo_name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  bypass_actors {
    actor_id    = 5 # RepositoryRole: admin
    actor_type  = "RepositoryRole"
    bypass_mode = "always"
  }

  rules {
    deletion         = true
    non_fast_forward = true

    pull_request {
      required_approving_review_count = 0
    }

    required_status_checks {
      # integration_id 15368 = GitHub Actions。同じ名前の status を他の経路から付けられても通らない
      required_check {
        context        = "build"
        integration_id = 15368
      }
      required_check {
        context        = "plan"
        integration_id = 15368
      }
    }
  }
}
