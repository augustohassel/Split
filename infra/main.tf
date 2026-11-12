locals {
  required_apis = [
    "firestore.googleapis.com",
    "identitytoolkit.googleapis.com",
    "firebaserules.googleapis.com",
    "firebase.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
  ]

  effective_authorized_domains = distinct(concat(
    var.authorized_domains,
    [
      "${var.project_id}.firebaseapp.com",
      "${var.project_id}.web.app",
    ]
  ))

  # Aislamiento multi-tenant por UID: cada nadador autenticado con Google accede únicamente a su propio espacio /users/{uid}/...
  firestore_rules_content = file("${path.module}/firestore.rules")
}

# 1. Activación declarativa de APIs de GCP (prevención de errores 403 API disabled)
resource "google_project_service" "apis" {
  for_each = toset(local.required_apis)

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# 2. Inicialización del proyecto en Firebase (requerido para SDK web y reglas de Firebase)
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [
    google_project_service.apis["firebase.googleapis.com"],
  ]
}

# 3. Base de datos Cloud Firestore en modo Native (Free Tier perpetuo en nam5 / us-central1)
resource "google_firestore_database" "default" {
  project                           = var.project_id
  name                              = "(default)"
  location_id                       = var.region
  type                              = "FIRESTORE_NATIVE"
  concurrency_mode                  = "OPTIMISTIC"
  app_engine_integration_mode       = "DISABLED"
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_DISABLED"
  delete_protection_state           = "DELETE_PROTECTION_DISABLED"

  depends_on = [
    google_project_service.apis["firestore.googleapis.com"],
    google_firebase_project.default,
  ]
}

# 4. Configuración de Identity Platform / Firebase Auth y dominios autorizados (GitHub Pages + Cloudflare + Localhost)
resource "google_identity_platform_config" "default" {
  provider                   = google-beta
  project                    = var.project_id
  autodelete_anonymous_users = true
  authorized_domains         = local.effective_authorized_domains

  sign_in {
    allow_duplicate_emails = false

    anonymous {
      enabled = false
    }

    email {
      enabled           = false
      password_required = false
    }
  }

  depends_on = [
    google_project_service.apis["identitytoolkit.googleapis.com"],
    google_firebase_project.default,
  ]
}

# 5. Conjunto de reglas de seguridad de Firestore (Firestore Security Rules)
resource "google_firebaserules_ruleset" "firestore" {
  provider = google-beta
  project  = var.project_id

  source {
    files {
      name    = "firestore.rules"
      content = local.firestore_rules_content
    }
  }

  depends_on = [
    google_project_service.apis["firebaserules.googleapis.com"],
    google_firestore_database.default,
  ]
}

# 6. Publicación (Release) activa del ruleset sobre la base (default) de Cloud Firestore
resource "google_firebaserules_release" "firestore" {
  provider     = google-beta
  project      = var.project_id
  name         = "cloud.firestore"
  ruleset_name = "projects/${var.project_id}/rulesets/${google_firebaserules_ruleset.firestore.name}"

  depends_on = [
    google_project_service.apis["firebaserules.googleapis.com"],
    google_firestore_database.default,
    google_firebaserules_ruleset.firestore,
  ]
}

# 7. Service Account dedicada para GitHub Actions (CI/CD Terraform)
resource "google_service_account" "github_actions" {
  project      = var.project_id
  account_id   = "github-actions-tf"
  display_name = "GitHub Actions Terraform CI/CD"
  description  = "Service Account utilizada por GitHub Actions mediante Workload Identity Federation (OIDC) para planificar y aplicar Terraform."

  depends_on = [
    google_project_service.apis["iam.googleapis.com"],
  ]
}

# Permisos sobre el proyecto para gestionar la infraestructura declarada en infra/
resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset([
    "roles/editor",
    "roles/firebase.admin",
    "roles/firebaserules.admin",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/iam.workloadIdentityPoolAdmin",
    "roles/storage.admin",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# 8. Workload Identity Pool y OIDC Provider para GitHub Actions (sin claves JSON)
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Pool OIDC para autenticar workflows de GitHub Actions"

  depends_on = [
    google_project_service.apis["iam.googleapis.com"],
    google_project_service.apis["sts.googleapis.com"],
  ]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository == '${var.github_repository}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Permitir al repositorio de GitHub personificar la Service Account vía OIDC
resource "google_service_account_iam_member" "github_oidc_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"

  depends_on = [
    google_project_service.apis["iamcredentials.googleapis.com"],
  ]
}
