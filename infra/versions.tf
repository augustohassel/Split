terraform {
  required_version = ">= 1.17.0"

  backend "gcs" {
    bucket = "split-swim-app-tfstate"
    prefix = "terraform/state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.10"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 8.10"
    }
  }
}
