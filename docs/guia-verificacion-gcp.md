# Guía APB de Verificación y Monitoreo en Google Cloud Platform (`split-swim-app`)

Este documento explica paso a paso —con enlaces directos— **dónde entrar y qué mirar** en la consola de **Google Cloud (GCP)** y en la **Consola de Firebase** para comprobar que todos los servicios de **Split** estén activos, seguros, sincronizando tus marcas de natación y operando dentro del **Free Tier ($0.00 USD/mes)**.

> 💡 **Dato clave**: El ID del proyecto es **`split-swim-app`**. Todos los enlaces de abajo ya tienen ese ID incluido para abrirlos con un solo clic.

---

## Mapa Rápido de Accesos Directos

| Qué querés revisar | Enlace directo |
| :--- | :--- |
| **1. Ver tus marcas, objetivos, perfil y chat guardados en la nube** | [Abrir Firestore Data (Firebase Console)](https://console.firebase.google.com/project/split-swim-app/firestore/databases/-default-/data) |
| **2. Ver las Reglas de Seguridad (`firestore.rules`) activas** | [Abrir Firestore Rules (Firebase Console)](https://console.firebase.google.com/project/split-swim-app/firestore/databases/-default-/rules) |
| **3. Ver usuarios registrados y tu UID de Google** | [Abrir Authentication Users (Firebase Console)](https://console.firebase.google.com/project/split-swim-app/authentication/users) |
| **4. Habilitar Google Login y ver Dominios Autorizados** | [Abrir Sign-in Method / Settings (Firebase Console)](https://console.firebase.google.com/project/split-swim-app/authentication/providers) |
| **5. Obtener las 4 variables `VITE_FIREBASE_*` para GitHub** | [Abrir Configuración del Proyecto (Firebase Console)](https://console.firebase.google.com/project/split-swim-app/settings/general) |
| **6. Ver cuotas de uso diario (Free Tier $0/mes)** | [Abrir Firestore Usage & Quotas (Firebase Console)](https://console.firebase.google.com/project/split-swim-app/firestore/databases/-default-/usage) |
| **7. Ver las APIs habilitadas por Terraform en GCP** | [Abrir APIs & Services Dashboard (GCP Console)](https://console.cloud.google.com/apis/dashboard?project=split-swim-app) |
| **8. Ver el estado remoto de Terraform (`tfstate`) en GCS** | [Abrir Bucket `split-swim-app-tfstate` (GCP Console)](https://console.cloud.google.com/storage/browser/split-swim-app-tfstate?project=split-swim-app) |
| **9. Ver el Pool OIDC y Service Account de GitHub Actions** | [Abrir Workload Identity Pools (GCP Console)](https://console.cloud.google.com/iam-admin/workload-identity-pools?project=split-swim-app) |

---

## Paso a Paso Detallado: ¿Qué debería verse en cada pantalla?

### 1. Base de Datos Cloud Firestore (Tus Marcas y Objetivos en la Nube)
- **Dirección**: https://console.firebase.google.com/project/split-swim-app/firestore/databases/-default-/data
- **También en GCP Console**: https://console.cloud.google.com/firestore/databases/-default-/data/panel?project=split-swim-app
- **Qué tenés que ver**:
  1. Una base de datos llamada **`(default)`** en modo **Native** ubicada en la región **`nam5` (us-central)**.
  2. Una vez que inicies sesión en **Split** con Google (Issue #17), aparecerá la colección raíz **`users`**.
  3. Dentro de **`users`**, verás un documento con tu **`{uid}`** (el identificador único de tu cuenta de Google) y tus subcolecciones (`marks`, `goals`, `profile`, `chatMessages`).

---

### 2. Reglas de Seguridad de Firestore (`firestore.rules`)
- **Dirección**: https://console.firebase.google.com/project/split-swim-app/firestore/databases/-default-/rules
- **Qué tenés que ver**:
  - Las reglas desplegadas automáticamente por Terraform donde solo el propietario autenticado (`request.auth != null && request.auth.uid == userId`) puede leer o escribir en `/users/{userId}/{document=**}`, y cualquier otro acceso tiene `allow read, write: if false;`.

---

### 3. Autenticación con Google y Dominios Autorizados
- **Dirección de Proveedores**: https://console.firebase.google.com/project/split-swim-app/authentication/providers
- **Dirección de Dominios Autorizados**: https://console.firebase.google.com/project/split-swim-app/authentication/settings

#### 🔍 Cómo habilitar el proveedor de Google
1. Entrá a https://console.firebase.google.com/project/split-swim-app/authentication/providers (**Authentication -> Sign-in method**).
2. Si **Google** aún no figura como `Habilitado`:
   - Hacé clic en **Agregar proveedor nuevo** → elegí **Google**.
   - Activá el interruptor **Habilitar (Enable)**.
   - Seleccioná tu correo en **Correo electrónico de asistencia del proyecto** y hacé clic en **Guardar**.

#### 🌐 Verificación de Dominios Autorizados
- En **Settings -> Dominios autorizados**: Deberías ver cargados por Terraform:
  - `localhost`
  - `127.0.0.1`
  - `augustohassel.github.io`
  - `split.hasselpunk.com`
  - `hasselpunk.com`
  - `split-swim-app.firebaseapp.com`
  - `split-swim-app.web.app`

---

### 4. Obtener las 4 Variables `VITE_FIREBASE_*` (Para `.env.local` y GitHub Pages en Issue #17)
1. Entrá a **Configuración del Proyecto en Firebase**:
   - **Dirección**: https://console.firebase.google.com/project/split-swim-app/settings/general
2. Bajá hasta la sección **"Tus apps" (Your apps)**:
   - Si todavía dice *"No hay apps en tu proyecto"*, hacé clic en el botón **`</>` (Web)**, ponele de apodo `Split PWA` (sin tildar Firebase Hosting) y hacé clic en **Registrar app**.
3. Copiá los 4 valores de `firebaseConfig`:
   - `apiKey` $\rightarrow$ **`VITE_FIREBASE_API_KEY`**
   - `authDomain` $\rightarrow$ **`VITE_FIREBASE_AUTH_DOMAIN`** (`split-swim-app.firebaseapp.com`)
   - `projectId` $\rightarrow$ **`VITE_FIREBASE_PROJECT_ID`** (`split-swim-app`)
   - `appId` $\rightarrow$ **`VITE_FIREBASE_APP_ID`**
4. Configuralos en las variables de repositorio de GitHub (`https://github.com/augustohassel/Split/settings/variables/actions`) junto con:
   - `GCP_PROJECT_ID`: `split-swim-app`
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`: valor de `terraform output -raw workload_identity_provider`
   - `GCP_SERVICE_ACCOUNT`: `github-actions-tf@split-swim-app.iam.gserviceaccount.com`
