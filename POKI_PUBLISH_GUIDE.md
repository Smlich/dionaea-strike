# Guía de Publicación Web y Envío a Poki — Dionaea Strike

El proyecto está auditado, optimizado y empaquetado para pasar los controles técnicos de **Poki for Developers / Poki Inspector** y también para publicarse de forma independiente en cualquier hosting web estático.

## 1. Generar el paquete listo para subir

```bash
npm test
npm run lint
npm run package:poki
```

Esto ejecuta automáticamente:
1. Compilación de producción en `dist/` con rutas 100% relativas (`base: './'`).
2. Auditoría automática de cumplimiento Poki (SDK v2 presente, sin Service Workers, sin peticiones externas a Google Fonts, sin rutas absolutas `/...`, sin archivos huérfanos).
3. Empaquetado en `release/dionaea-strike-poki.zip` con `index.html` exactamente en la raíz del `.zip`.

## 2. Cómo subir el juego a Poki

1. Ingresá a **Poki for Developers** (`sdk.poki.com` / portal de partners) y abrí tu proyecto o creá un nuevo envío en **Poki Inspector**.
2. Subí directamente el archivo `release/dionaea-strike-poki.zip`.
3. En el **Poki Inspector**, verificá la secuencia del registro de eventos:
   - `init` → `gameLoadingFinished` al abrir el juego (el video introductorio se omite automáticamente dentro de Poki para maximizar la conversión a juego).
   - `gameplayStart` al presionar **Start** (sin anuncio pre-roll en la primera partida).
   - `gameplayStop` al pausar, perder foco/pestaña, completar nivel o terminar la partida.
   - `commercialBreak` en transiciones naturales hacia nueva acción (**Jugar de Nuevo**, **Reiniciar**, **Siguiente Nivel**), silenciando audio automáticamente durante el anuncio.

## 3. Cómo publicar en tu propia web (sin Poki)

Para publicar en cualquier hosting estático propio (**Cloudflare Pages**, **Netlify**, **Vercel**, **GitHub Pages** o **itch.io**) sin alertas de dominio de Poki:
- Ejecutá `npm run build`: genera `dist/` **sin** inyectar el script externo de `poki-sdk.js`, evitando el aviso de sitelock de Poki en dominios propios.
- Ejecutá `npm run package:poki`: genera `release/dionaea-strike-poki.zip` **con** el script oficial de Poki SDK v2 inyectado automáticamente para subir al **Poki Inspector**.
- En **Cloudflare Pages / Netlify / Vercel**: conectá el repositorio con comando de build `npm run build` y directorio de salida `dist`.
- En **itch.io**: comprimí el contenido de `dist/` (tras `npm run build`) y marcá *"This file will be played in the browser"*.
