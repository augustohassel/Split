output "project_id" {
  description = "ID del proyecto de GCP aprovisionado."
  value       = var.project_id
}

output "firestore_database_name" {
  description = "Nombre de la base de datos Cloud Firestore creada."
  value       = google_firestore_database.default.name
}

output "firestore_location" {
  description = "Ubicación configurada para Cloud Firestore."
  value       = google_firestore_database.default.location_id
}

output "firebase_auth_domain" {
  description = "Dominio de autenticación de Firebase para VITE_FIREBASE_AUTH_DOMAIN."
  value       = "${var.project_id}.firebaseapp.com"
}

output "authorized_domains" {
  description = "Lista efectiva de dominios autorizados en Identity Platform / Firebase Auth."
  value       = google_identity_platform_config.default.authorized_domains
}

output "firestore_ruleset_name" {
  description = "Identificador del ruleset desplegado en Cloud Firestore."
  value       = google_firebaserules_ruleset.firestore.name
}

output "workload_identity_provider" {
  description = "Nombre completo del Workload Identity Provider para GitHub Actions (google-github-actions/auth)."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_actions_service_account" {
  description = "Email de la Service Account utilizada por GitHub Actions."
  value       = google_service_account.github_actions.email
}
