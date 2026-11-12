variable "project_id" {
  description = "ID del proyecto de Google Cloud Platform (ej. split-swim-app)."
  type        = string
  default     = "split-swim-app"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "El project_id debe tener entre 6 y 30 caracteres (letras minúsculas, números y guiones)."
  }
}

variable "region" {
  description = "Región o multi-región para Cloud Firestore y recursos de GCP. 'nam5' (multi-región US) o 'us-central1' son compatibles con el Free Tier perpetuo de Firestore."
  type        = string
  default     = "nam5"

  validation {
    condition     = contains(["nam5", "us-central1"], var.region)
    error_message = "La región debe ser 'nam5' (multi-región US) o 'us-central1' para mantener costo $0.00 USD/mes."
  }
}

variable "authorized_domains" {
  description = "Lista de dominios autorizados para OAuth en Identity Platform / Firebase Auth."
  type        = list(string)
  default = [
    "localhost",
    "127.0.0.1",
    "augustohassel.github.io",
    "split.hasselpunk.com",
    "hasselpunk.com",
  ]
}

variable "github_repository" {
  description = "Repositorio de GitHub (owner/repo) autorizado mediante Workload Identity Federation (OIDC) para ejecutar Terraform en CI/CD."
  type        = string
  default     = "augustohassel/Split"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "github_repository debe tener el formato 'owner/repo'."
  }
}
