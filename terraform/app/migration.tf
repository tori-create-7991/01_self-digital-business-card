# 1 stack（terraform/state）から 2 stack へ移したときの後始末。
# 旧構成のリソースを state から外すだけで、GCP 上では消さない（destroy = false）。
#   - github-pool は他リポジトリの Provider がぶら下がっている共有 Pool なので、ここでは絶対に消さない。
#   - 旧 Provider・旧 SA・旧 SA の IAM は、新構成で CI が通ってから gcloud で消す
#     （docs/runbook/two-stage-migration.md）。
#   - API の有効化は bootstrap stack が引き継ぐ。
#   - 旧 Cloudflare レコードは移行手順の terraform state rm で外す（この stack に Cloudflare provider が無いため）。
# 移行が終わって次の apply が通ったら、このファイルは消してよい。

removed {
  from = google_iam_workload_identity_pool.github_pool
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_iam_workload_identity_pool_provider.github_provider
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_service_account.github_actions
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_project_iam_member.sa_roles
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_service_account_iam_member.wif_impersonation
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_project_service.firebase
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_project_service.serviceusage
  lifecycle {
    destroy = false
  }
}

removed {
  from = google_project_service.cloudresourcemanager
  lifecycle {
    destroy = false
  }
}

# custom_domain を任意にしたので count 付きになった
moved {
  from = google_firebase_hosting_custom_domain.card
  to   = google_firebase_hosting_custom_domain.card[0]
}
