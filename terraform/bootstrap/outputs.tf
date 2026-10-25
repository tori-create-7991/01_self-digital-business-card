output "wif_provider_name" {
  description = "google-github-actions/auth の workload_identity_provider に渡す値"
  value       = google_iam_workload_identity_pool_provider.github_actions.name
}

output "deployer_sa_email" {
  description = "main の production ジョブがなりすます SA"
  value       = google_service_account.deployer.email
}

output "planner_sa_email" {
  description = "plan とズレ検知がなりすます SA（読み取りだけ）"
  value       = google_service_account.planner.email
}
