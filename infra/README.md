# Infraestructura de Split en Google Cloud Platform (`infra/`)

Este directorio contiene la definición de Infraestructura como Código (**Terraform**) para aprovisionar de forma reproducible, segura y dentro del **Free Tier perpetuo ($0.00 USD/mes)** los servicios de Google Cloud Platform (GCP) requeridos por **Split**:

1. **Activación declarativa de APIs** (`google_project_service`):
   - `firestore.googleapis.com` (Cloud Firestore)
   - `identitytoolkit.googleapis.com` (Identity Platform / Firebase Auth)
   - `firebaserules.googleapis.com` (Firebase Security Rules API)
   - `firebase.googleapis.com` (Firebase Management API)
   - `iam.googleapis.com`, `iamcredentials.googleapis.com`, `sts.googleapis.com`, `cloudresourcemanager.googleapis.com`, `serviceusage.googleapis.com`
2. **Inicialización en Firebase** (`google_firebase_project`):
   - Habilita el proyecto en Firebase para permitir el registro de la App Web (`</>`) y la gestión de reglas.
3. **Cloud Firestore en modo Native** (`google_firestore_database`):
   - Base de datos `(default)` configurada por defecto en `nam5` (multi-región US) o `us-central1`, elegibles para el nivel gratuito perpetuo (1 GiB de almacenamiento, 50.000 lecturas/día, 20.000 escrituras/día, 20.000 borrados/día).
4. **Identity Platform / Firebase Auth** (`google_identity_platform_config`):
   - Configuración de dominios autorizados para OAuth (`localhost`, `127.0.0.1`, `augustohassel.github.io`, `split.hasselpunk.com`, `hasselpunk.com` y los dominios `.firebaseapp.com` / `.web.app` del proyecto).
5. **Firestore Security Rules** (`google_firebaserules_ruleset` y `google_firebaserules_release`):
   - Despliegue declarativo de `firestore.rules` con denegación por defecto y aislamiento multi-usuario estricto bajo `/users/{userId}/{document=**}` verificando `request.auth != null && request.auth.uid == userId` (cada nadador accede únicamente a sus propias marcas, objetivos, perfil y chat).
6. **Backend Remoto en GCS y Despliegue Continuo en GitHub Actions (OIDC)**:
   - Estado remoto almacenado en el bucket `gs://split-swim-app-tfstate` (con versionado activo y acceso público bloqueado).
   - **Workload Identity Federation (`github-actions-pool` / `github-oidc`)** y Service Account (`github-actions-tf@split-swim-app.iam.gserviceaccount.com`) que permiten al workflow `.github/workflows/terraform-validate.yml` ejecutar `terraform plan` en PRs/ramas y **`terraform apply` automáticamente al mergear en `master`**, sin almacenar claves JSON de larga duración en GitHub.

---

## Requisitos Previos

- **Terraform** `>= 1.17.0` (ya preinstalado en el Dev Container de Split).
- **Google Cloud SDK (`gcloud`)** (ya preinstalado en el Dev Container de Split).
- Una cuenta de Google con el proyecto `split-swim-app` en GCP (con facturación vinculada para activar Identity Platform, operando siempre dentro de las cuotas gratuitas).

---

## Guía Paso a Paso (Desde el Dev Container)

### 1. Autenticarse en GCP, crear el proyecto y el bucket de estado remoto (sin claves JSON)

Usando **Application Default Credentials (ADC)** directamente en la terminal del contenedor:

```bash
# 1. Iniciar sesión en Google Cloud CLI
gcloud auth login

# 2. Crear el proyecto en GCP (si aún no existe)
gcloud projects create split-swim-app --name="Split Swim App"

# 3. Configurar el proyecto activo
gcloud config set project split-swim-app

# 4. Vincular cuenta de facturación (requerido por Identity Platform, costo $0 en Free Tier)
# Listar cuentas de facturación disponibles:
gcloud billing accounts list
# Vincular (reemplazar BILLING_ACCOUNT_ID por el ID listado):
gcloud billing projects link split-swim-app --billing-account=BILLING_ACCOUNT_ID

# 5. Generar credenciales ADC para Terraform
gcloud auth application-default login
gcloud auth application-default set-quota-project split-swim-app

# 6. Crear el bucket de GCS para el estado remoto de Terraform (Free Tier us-central1)
gcloud storage buckets create gs://split-swim-app-tfstate \
  --project=split-swim-app \
  --location=us-central1 \
  --uniform-bucket-level-access
gcloud storage buckets update gs://split-swim-app-tfstate --versioning
```

### 2. Configurar variables locales (`terraform.tfvars`)

```bash
cd /workspaces/Split/infra
cp terraform.tfvars.example terraform.tfvars
```

### 3. Inicializar, Validar, Previsualizar y Aplicar

```bash
cd /workspaces/Split/infra

# Inicializar providers y backend remoto en GCS
terraform init

# Verificar formato y validez sintáctica
terraform fmt -check
terraform validate

# Previsualizar el plan de ejecución
terraform plan

# Aplicar los cambios en GCP
terraform apply
```

### 4. Habilitar el Proveedor de Google OAuth y Registrar la Web App en Firebase

Una vez ejecutado `terraform apply`:
1. Ingresa a [Firebase Console](https://console.firebase.google.com/project/split-swim-app/authentication/providers) → **Authentication** → **Sign-in method**.
2. Habilita el proveedor **Google** (seleccionando tu correo de soporte del proyecto).
3. En [Configuración del proyecto](https://console.firebase.google.com/project/split-swim-app/settings/general) → **Tus apps**, registra una **App Web (`</>`)** para obtener los identificadores públicos (`apiKey`, `appId`, `projectId`, `authDomain`) que se utilizarán en las variables `VITE_FIREBASE_*` del frontend (Issue #17).

> 📌 **¿Dónde mirar en GCP/Firebase que todo funcione?**: Consulta la [Guía APB de Verificación y Monitoreo en GCP (`docs/guia-verificacion-gcp.md`)](../docs/guia-verificacion-gcp.md) con todos los enlaces directos al proyecto `split-swim-app`.
