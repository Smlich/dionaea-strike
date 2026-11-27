# Dionaea Strike — Escuadrón Pampa

Shoot 'em up aéreo de desplazamiento lateral en **React 19 + TypeScript + Tailwind CSS v4 + Canvas 2D** con estética anime argentina. Diseñado tanto para ejecutarse de forma independiente como para integrarse directamente dentro de la web de **Carnívoras Tucumán**.

## Características principales

- **Video de introducción + transición anime:** cortina diagonal celeste, blanca, dorada y carmesí con líneas de velocidad, destello suave y soporte para `prefers-reduced-motion`.
- **5 niveles terrestres:** Amanecer en La Pampa, Selva Misionera y Cataratas, Buenos Aires Nocturno, Viaducto y Puerto Urbano, y Quebrada de Humahuaca / Andes, cada uno con mini-jefe, jefe final y pista musical propia sincronizada por BPM.
- **8 especies de plantas carnívoras:** *Dionaea*, *Drosera*, *Nepenthes*, *Utricularia*, *Sarracenia*, *Pinguicula*, *Heliamphora* y *Cephalotus*, con sistema de **2 ranuras activas** (Nv. 1–4), **Fusión Ápice** y **Evolución Secreta (Nv. 5)**.
- **5 mascotas copiloto desbloqueables:** *Sapo Batricio*, *Roy*, *Sicario*, *Palito* y *Carpincho Matero*, con defensa cercana y poder especial (`Espacio` / `B` / `LT`).
- **3 modos de dificultad** (*Fácil*, *Normal*, *Difícil*) con escalado dinámico y tabla local/global de récords.
- **Controles completos:** teclado, ratón, pantalla táctil con modo horizontal automático en móvil y mando Xbox con detección automática.
- **Listo para embeber:** estilos aislados en `src/dionaea-styles.css` (no pisa el scroll ni el fondo global del sitio anfitrión) y overlays contenidos dentro de `.dionaea-game-root`.

## Requisitos

- Node.js 20+ y npm

## Comandos

```bash
npm install
npm run dev      # Servidor de desarrollo en http://localhost:3000
npm test         # Suite completa de pruebas unitarias (54 tests)
npm run lint     # Verificación estricta de TypeScript (tsc --noEmit)
npm run build    # Compilación de producción en dist/
npm run preview  # Previsualizar el build de producción
npm run clean    # Limpiar dist/ y dev-dist/
```

## Integración en la página web

- Consulta [MERN_INTEGRATION.md](MERN_INTEGRATION.md) para el manifiesto exacto de archivos, props del componente (`CarnivoraShmupGameProps`), rutas de assets y endpoints Express/MongoDB para integrar el juego directamente en tu sitio web.
- En desarrollo local, añadí `?admin=1` a la URL para abrir el panel de configuración (`AdminConfigModal`).
