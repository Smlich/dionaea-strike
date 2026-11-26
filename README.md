# Dionaea Strike — Escuadrón Pampa

Shoot 'em up aéreo de desplazamiento lateral en React, TypeScript y Canvas 2D con estética anime. Pilota un biplano carnívoro sobre cinco regiones terrestres, fusiona habilidades botánicas rotativas y combate junto a mascotas copiloto al ritmo de la música de cada nivel.

## Características principales

- **5 niveles terrestres:** Amanecer en La Pampa, Selva Misionera y Cataratas, Buenos Aires Nocturno, Viaducto y Puerto Urbano, y Quebrada de Humahuaca / Andes, cada uno con mini-jefe, jefe final y pista musical propia sincronizada por BPM.
- **8 especies de plantas carnívoras:**
  - Iniciales: *Dionaea*, *Drosera*, *Nepenthes* y *Utricularia*.
  - Desbloqueables por nivel: *Sarracenia*, *Pinguicula*, *Heliamphora* y *Cephalotus*.
  - Sistema de **2 ranuras activas** (Nv. 1–4) o **Evolución Secreta pura (Nv. 5)** al recolectar cápsulas de una sola especie.
- **Habilidades duales rotativas:** ataque principal automático y habilidad secundaria manual (`E` / clic derecho / `A` o `RT`), intercambiables en vuelo (`Q` / `X` o `LB`).
- **5 mascotas copiloto desbloqueables:** *Sapo Batricio*, *Roy*, *Sicario*, *Palito* y *Carpincho Matero*, cada una con defensa cercana y poder especial (`Espacio` / `B` o `LT`).
- **Controles completos y PWA:** teclado, ratón/táctil y control Xbox con detección automática de gamepad, además de soporte instalable offline con `vite-plugin-pwa`.

## Requisitos

- Node.js 20+ y npm

## Instalación y comandos

```bash
npm install
npm run dev
```

Otros comandos disponibles:

- `npm test`: ejecuta la suite de pruebas en [src/game/fusionRules.test.ts](src/game/fusionRules.test.ts)
- `npm run lint`: verifica tipos con `tsc --noEmit`
- `npm run build`: genera la compilación de producción en `dist/`
- `npm run preview`: previsualiza el build de producción
- `npm run clean`: limpia `dist/` y `dev-dist/`

## Modo Administrador e integración MERN

- Añade `?admin=1` a la URL en local para abrir el panel de configuración (`AdminConfigModal`), editar parámetros de especies, enemigos, oleadas y jefes, o exportar/importar la configuración en JSON.
- Consulta [MERN_INTEGRATION.md](MERN_INTEGRATION.md) para integrar `CarnivoraShmupGame` dentro de una aplicación MongoDB + Express + React + Node.
