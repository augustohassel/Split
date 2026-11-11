# 0006: Infraestructura Serverless en GCP con Terraform In-Repo y Workload Identity OIDC

- **Fecha**: 2026-11-11
- **Estado**: Aceptada
- **Issue Asociado**: [#16](https://github.com/augustohassel/Split/issues/16) (Padre: [#15](https://github.com/augustohassel/Split/issues/15))

## Contexto y Problema
A partir de la evolución planteada en la épica #15, **Split** mantiene su funcionamiento *Offline-First* sobre IndexedDB ([ADR-0001](0001-arquitectura-base-offline-first.md)), pero necesita sumar autenticación con Google OAuth y sincronización cloud multi-dispositivo a costo **$0.00 USD/mes**, siguiendo el estándar probado en **MiBarcito** (`ADR-004`).

Configurar manualmente los servicios de Google Cloud Platform (Cloud Firestore, Identity Platform y Security Rules) desde la consola web introduce deriva de configuración (*configuration drift*), falta de trazabilidad de reglas de seguridad multi-usuario y riesgo de errores de permisos al habilitar APIs. Asimismo, automatizar el despliegue desde GitHub Actions usando claves JSON de cuentas de servicio estáticas implicaría almacenar secretos de larga duración vulnerables a fugas.

## Alternativas Evaluadas

1. **Configuración manual en Firebase / Google Cloud Console (`ClickOps`)**:
   - *Ventajas*: Configuración inicial rápida sin escribir manifiestos.
   - *Desventajas*: Sin control de versiones ni revisión en Pull Requests de los dominios OAuth autorizados ni de las reglas de aislamiento de Firestore; imposible reproducir o auditar el entorno de forma determinística.

2. **Repositorio separado (`Split-infra`)**:
   - *Ventajas*: Separación física entre código frontend e infraestructura.
   - *Desventajas*: Desincroniza la evolución de las colecciones consumidas por los repositorios TypeScript en `src/` respecto de las reglas de seguridad en `firestore.rules`.

3. **Terraform *In-Repo* (`infra/`) + Backend Remoto en GCS + Workload Identity Federation (OIDC) en GitHub Actions**:
   - *Ventajas*: Declaración integral, auditable e idempotente de las APIs (`google_project_service` con `depends_on` explícitos), inicialización de `google_firebase_project`, base de datos Cloud Firestore en modo `FIRESTORE_NATIVE` dentro de regiones Free Tier (`nam5` / `us-central1`), `google_identity_platform_config` con dominios autorizados (`localhost`, `127.0.0.1`, `augustohassel.github.io`, `split.hasselpunk.com`, `hasselpunk.com` y `.firebaseapp.com`/`.web.app`) y `google_firebaserules_ruleset` / `release`. La federación OIDC elimina por completo las claves JSON estáticas en GitHub Secrets.
   - *Desventajas*: Requiere un único bootstrap inicial desde el Dev Container (`gcloud` + `terraform apply`) para crear el proyecto, el bucket de estado y el Workload Identity Pool antes de delegar las ejecuciones subsiguientes a GitHub Actions.

## Decisión Adoptada
Se adopta la **Alternativa 3 (Terraform *In-Repo* en `infra/` con Backend en GCS y Workload Identity Federation OIDC)**:
- **Entorno Dev Container (`.devcontainer/`)**: Se preinstalan `google-cloud-cli` (`gcloud`) y `terraform >= 1.17.0` en `Dockerfile`, junto con las extensiones `hashicorp.terraform` y `hashicorp.hcl` en `devcontainer.json`.
- **Estructura en `infra/`**: Manifiestos modulares (`versions.tf`, `providers.tf`, `variables.tf`, `main.tf`, `outputs.tf`, `firestore.rules`, `terraform.tfvars.example` y `README.md`) con providers `hashicorp/google` y `hashicorp/google-beta` (`~> 8.10`), activando `user_project_override = true` y `billing_project = var.project_id` para operar con Application Default Credentials (ADC).
- **Estado Remoto en GCS**: El estado de Terraform se almacena en el bucket `gs://split-swim-app-tfstate` (`us-central1`, dentro del Free Tier de 5 GB de Cloud Storage) con versionado habilitado.
- **Prevención de condiciones de carrera (`403 API disabled`)**: Todos los recursos dependientes declaran `depends_on` explícitos hacia `google_project_service.apis[...]` con `disable_on_destroy = false`.
- **Aislamiento multi-usuario en Firestore (`infra/firestore.rules`)**: Denegación global por defecto (`allow read, write: if false;`) y acceso exclusivo a `/users/{userId}/{document=**}` cuando `request.auth != null && request.auth.uid == userId`.
- **CI/CD seguro (`.github/workflows/terraform-validate.yml`)**:
  - Job `validate` sin credenciales (`terraform fmt -check`, `terraform init -backend=false`, `terraform validate`).
  - Job `plan` conectado al estado remoto en GCS mediante OIDC.
  - Job `apply` en `master` autenticado mediante `google-github-actions/auth@v2` vía OIDC (`roles/iam.workloadIdentityUser` restringido por `assertion.repository == 'augustohassel/Split'`).

## Consecuencias y Trade-offs
- El costo operativo mensual en GCP se mantiene en **$0.00 USD/mes** aprovechando las cuotas perpetuas de Cloud Firestore (`nam5`/`us-central1`, 1 GiB y 50,000 lecturas/día), Identity Platform (hasta 50,000 MAU) y Cloud Storage.
- [`.gitignore`](../../.gitignore) bloquea de forma estricta cualquier archivo `.tfstate`, directorio `.terraform/`, `.tfvars` real o credencial JSON para impedir fugas accidentales de estado o secretos en el repositorio.
- Se documenta en [`docs/guia-verificacion-gcp.md`](../guia-verificacion-gcp.md) la guía paso a paso para verificar los recursos en la consola de GCP y Firebase.
