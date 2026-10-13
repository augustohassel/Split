# 0002: Aislamiento de Web Origin mediante Subdominio Propio (`split.hasselpunk.com`)

- **Fecha**: 2026-10-13
- **Estado**: Aceptada

## Contexto y Problema
**Split** forma parte del ecosistema de aplicaciones personales del autor junto con `RatingsApp` (`ratings.hasselpunk.com`) y `AntropoPopo`.

Dado que los navegadores web aíslan el almacenamiento local (`IndexedDB`, `localStorage`, `CacheStorage`) y la identidad de instalación de PWAs (WebAPK en Android y Safari en iOS) por **Web Origin** (`esquema + host + puerto`, ignorando la ruta), desplegar múltiples PWAs como subrutas de un mismo dominio raíz (`www.hasselpunk.com/Split/`) produciría:
1. **Colisión de instalación PWA**: El sistema operativo móvil detectaría el mismo origen e impediría instalar **Split** y **RatingsApp** como aplicaciones independientes en el mismo teléfono.
2. **Almacenamiento local compartido**: Borrar los datos de sitio de una aplicación en el navegador podría afectar el almacenamiento local (`IndexedDB`) de las demás aplicaciones del mismo origen.

## Alternativas Evaluadas
1. **Alternativa A (Subdominio dedicado en GitHub Pages — `split.hasselpunk.com`)**:
   - Configurar un registro DNS `CNAME` (`split` -> `augustohassel.github.io`), incluir `public/CNAME` en el repositorio y servir la aplicación en la raíz (`/`) de su propio *Web Origin*.
   - *Ventajas*: Aislamiento total de `IndexedDB` (`SplitSwimmingDB`) y Service Worker, instalación simultánea nativa en Android e iOS junto a `RatingsApp`, y certificados HTTPS automáticos en GitHub Pages sin costo adicional.
   - *Desventajas*: Requiere dar de alta el registro `CNAME` `split` en el proveedor DNS de `hasselpunk.com`.
2. **Alternativa B (Subruta `www.hasselpunk.com/Split/`)**:
   - *Ventajas*: Sin cambios en el DNS.
   - *Desventajas*: Comparte *Web Origin* y almacenamiento `IndexedDB` con otras apps bajo `www.hasselpunk.com`.

## Decisión Adoptada
Se adopta la **Alternativa A**: servir **Split** bajo su propio subdominio exclusivo (`https://split.hasselpunk.com/`) mediante `public/CNAME`, manteniendo `base: process.env.VITE_BASE_PATH || '/'` y el manifiesto PWA configurado con `id: '/'`, `scope: '/'` y `start_url: '/'`.

## Consecuencias y Trade-offs
- **Split** cuenta con un *Web Origin* 100% aislado (`https://split.hasselpunk.com`), permitiendo instalarla en el mismo dispositivo móvil junto con `RatingsApp` sin colisiones y protegiendo la base de datos local `SplitSwimmingDB`.

