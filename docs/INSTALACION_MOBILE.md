# Guía de Instalación Mobile y Cómo Compartir la App 📱🚀

**Split** fue creada como una **Progressive Web App (PWA)**: combina la inmediatez de una página web con la experiencia a pantalla completa, velocidad y funcionamiento **100% sin conexión a internet (offline)** de una aplicación nativa en tu celular. Ideal para piletas y clubes donde suele haber poca señal.

---

## 1. Cómo Instalar Split como App en tu Celular

Una vez que abrís **Split** desde el navegador de tu teléfono (`https://split.hasselpunk.com`), podés instalarla en tu pantalla de inicio:

### En iPhone (iOS - Safari):

1. Abrí el enlace en **Safari**.
2. Tocá el botón **Compartir** (el cuadrado con la flecha hacia arriba en la barra inferior).
3. Deslizá hacia abajo y tocá **"Agregar a inicio"** (_Add to Home Screen_).
4. Tocá **"Agregar"** arriba a la derecha.
5. ¡Listo! Verás el ícono de **Split** en tu pantalla de inicio y se abrirá a pantalla completa sin barras de navegador.

### En Android (Google Chrome):

1. Abrí el enlace en **Chrome**.
2. Tocá el aviso inferior **"Instalar aplicación"** (o abrí el menú de tres puntos `⋮` arriba a la derecha y elegí **"Instalar aplicación"** / **"Agregar a la pantalla principal"**).
3. Confirmá la instalación y **Split** quedará integrada como una app más en tu teléfono.

---

## 2. Cómo Probar la App en tu Celular desde tu Red WiFi Local (Desarrollo)

Si estás corriendo el entorno de desarrollo en tu computadora y querés probarla en tu teléfono dentro de la misma red Wi-Fi:

1. Averiguá la IP local de tu computadora (en Windows ejecutá `ipconfig` en PowerShell y buscá `Dirección IPv4`, ej. `192.168.1.45`).
2. Asegurate de que el servidor esté corriendo con `npm run dev` (que ya incluye `--host` en el puerto `5173`).
3. En el navegador de tu celular ingresá:
   ```text
   http://<TU_IP_LOCAL>:5173
   ```

---

## 3. Despliegue Oficial en GitHub Pages (`split.hasselpunk.com`)

Para que **Split** conviva en tu teléfono junto con otras PWAs (como `RatingsApp`) sin colisionar en la instalación ni mezclar bases de datos locales (`IndexedDB`), se sirve en la raíz de su propio subdominio:

1. El repositorio incluye `public/CNAME` apuntando a `split.hasselpunk.com`.
2. En el panel DNS de `hasselpunk.com`, configurá un registro **CNAME**:
   - **Host / Nombre**: `split`
   - **Destino / Valor**: `augustohassel.github.io`
   - **Proxy (Cloudflare)**: _DNS Only_ (nube gris) para permitir que GitHub Pages gestione el certificado SSL/HTTPS automáticamente.
3. En **GitHub → Settings → Pages**:
   - En _Build and deployment → Source_, seleccioná **GitHub Actions**.
   - En _Custom domain_, verificá `split.hasselpunk.com` y marcá **Enforce HTTPS**.

### ¿Qué pasa si compartís el link con otro nadador o entrenador?

Como **Split no tiene servidor backend**, cada persona que abre el enlace tiene su **propia base de datos privada en su propio teléfono**. Nadie puede ver tus tiempos ni vos los de otra persona.

---

## 4. Copias de Seguridad, Migración de Celular y Limpieza de Datos

Todos tus datos se guardan localmente en tu teléfono (`IndexedDB`). Si cambiás de teléfono o querés hacer un resguardo:

1. Andá a la pestaña **Objetivos → Datos**.
2. Tocá **"Exportar Backup JSON"** y guardá el archivo en tu Drive, WhatsApp o Email.
3. En el nuevo dispositivo, entrá a **Objetivos → Datos**, tocá **"Importar Backup JSON"** y seleccioná ese archivo.
4. Si querés analizar tus marcas en una planilla de cálculo, tocá **"Exportar Marcas CSV"** para abrirlas directamente en Excel o Google Sheets.
5. Si cargaste los _Datos de Demostración_ para explorar la app y querés empezar de cero con tus marcas reales, usá el botón **"Borrar marcas y objetivos"** dentro de la sección _Zona de Peligro_.

---

## 5. Actualizaciones Automáticas de la App 🔄

- Cada vez que se publica una nueva versión en `master`, **Split** descarga la actualización en segundo plano cuando tenés conexión.
- Al cerrar y volver a abrir la app (o al refrescar la página), contarás con la última versión instalada **sin perder jamás tus marcas ni objetivos guardados**.
