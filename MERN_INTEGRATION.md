# Integración de Dionaea Strike en una Web React / MERN

Este repositorio está limpio y preparado para integrarse directamente dentro del código de tu sitio web (sin SDKs externos ni scripts de terceros).

---

## Manifiesto de archivos requeridos

Para integrar el juego como módulo React dentro del frontend de tu sitio (por ejemplo en `client/src/games/dionaea-strike/`):

### 1. Código fuente y estilos (copiar a `client/src/games/dionaea-strike/`)
- `src/components/` (todos los componentes React del juego)
- `src/game/` (motor de simulación, renderizador Canvas 2D, audio Web Audio, dificultad, partículas, récords y transición de intro; podés omitir `*.test.ts` al copiar a producción)
- `src/assets/images/` (los 7 fondos/ilustraciones `.jpg`, importados estáticamente por Vite/bundler)
- `src/dionaea-embed.ts` (punto de entrada único con exports tipados)
- `src/dionaea-styles.css` (estilos y keyframes encapsulados)

> **Importante sobre CSS:** **No** copies `src/index.css` a tu tienda. `dionaea-embed.ts` importa automáticamente `dionaea-styles.css`, que solo aplica reglas scoped a `.dionaea-game-root` y keyframes de animación, sin tocar `html`, `body` ni el scroll global de tu página web. Todos los overlays (intro, título, HUD, pausa, récords) usan posicionamiento `absolute` dentro de `.dionaea-game-root`, por lo que respetan el tamaño del contenedor que le pases.

### 2. Assets públicos estáticos (copiar a `client/public/assets/`)
- `public/assets/audio/` (`menu-theme.m4a` y `level-1-pampa.m4a` … `level-5-boss.m4a`)
- `public/assets/video/` (`intro.webm`)

*(Si los copiás en una subcarpeta distinta, por ejemplo `client/public/dionaea/assets/`, simplemente pasá `assetBasePath="/dionaea"` al componente.)*

### 3. Dependencias del frontend anfitrión
```bash
npm install lucide-react
```
- **Framework:** React 19 (compatible con React 18+), TypeScript y Tailwind CSS v4.
- **Sin API keys ni motores externos:** renderizado en Canvas 2D nativo y audio en Web Audio API.
- **Fuentes opcionales (recomendadas):** `Outfit`, `Plus Jakarta Sans` y `JetBrains Mono` (si no se cargan, el juego degrada limpiamente a `system-ui`).

---

## Props disponibles (`CarnivoraShmupGameProps`)

| Prop | Tipo | Default | Uso |
| --- | --- | --- | --- |
| `assetBasePath` | `string` | `'.'` | Ruta base pública desde donde se sirven `assets/audio/*` y `assets/video/intro.webm` (ej. `'/'` o `'/juego'`). |
| `className` | `string` | `'w-full h-dvh'` | Tamaño del contenedor cuando se embebe dentro de un layout (ej. `'w-full h-[calc(100dvh-64px)]'`). |
| `skipIntro` | `boolean` | `false` | Si es `true`, omite el video introductorio y abre directo en la pantalla de título. |
| `isAdmin` | `boolean` | `false` | Habilita el botón y modal de configuración avanzada (`AdminConfigModal`) solo para administradores. |
| `initialConfig` | `GameConfig` | `undefined` | Configuración inicial opcional cargada desde tu API/MongoDB. |
| `onConfigChange` | `(config: GameConfig) => void` | `undefined` | Callback al guardar cambios desde el panel de administrador (`PUT /api/game/config`). |
| `onScoreSubmit` | `(result: GameSessionResult) => void` | `undefined` | Callback automático al terminar una partida (`POST /api/game/scores`). |

---

## Opción 1 (Recomendada): Montar como ruta React (`/juego`)

```tsx
import { useEffect, useState } from 'react';
import {
  CarnivoraShmupGame,
  type GameConfig,
  type GameSessionResult,
} from './games/dionaea-strike/dionaea-embed';

export function DionaeaPage({ currentUser }: { currentUser?: { role?: string; token?: string } }) {
  const [serverConfig, setServerConfig] = useState<GameConfig | undefined>();

  useEffect(() => {
    fetch('/api/game/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.config && setServerConfig(data.config))
      .catch(() => {});
  }, []);

  const handleSaveAdminConfig = async (nextConfig: GameConfig) => {
    await fetch('/api/game/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser?.token ?? ''}`,
      },
      body: JSON.stringify({ config: nextConfig }),
    });
  };

  const handleScoreSubmit = async (result: GameSessionResult) => {
    await fetch('/api/game/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser?.token ?? ''}`,
      },
      body: JSON.stringify(result),
    });
  };

  return (
    <CarnivoraShmupGame
      className="w-full h-[calc(100dvh-64px)]"
      assetBasePath="/"
      isAdmin={currentUser?.role === 'admin'}
      initialConfig={serverConfig}
      onConfigChange={handleSaveAdminConfig}
      onScoreSubmit={handleScoreSubmit}
    />
  );
}
```

### Endpoints Express + Modelo Mongoose (`server/`)

```js
// server/models/GameScore.js
import mongoose from 'mongoose';

const gameScoreSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    score: { type: Number, required: true, min: 0 },
    highScore: { type: Number, default: 0 },
    maxCombo: { type: Number, default: 0 },
    levelReached: { type: Number, min: 1, max: 5, default: 1 },
    victory: { type: Boolean, default: false },
    elapsedSec: { type: Number, default: 0 },
    enemiesDefeated: { type: Number, default: 0 },
    damageTaken: { type: Number, default: 0 },
    petId: { type: String, enum: ['batricio', 'roy', 'sicario', 'palito', 'carpincho'], default: 'batricio' },
  },
  { timestamps: true }
);

export const GameScore = mongoose.model('GameScore', gameScoreSchema);
```

```js
// server/routes/gameRoutes.js
import express from 'express';
import { GameScore } from '../models/GameScore.js';

const router = express.Router();

router.get('/scores/top', async (_req, res) => {
  const scores = await GameScore.find().sort({ score: -1 }).limit(20).populate('userId', 'name');
  res.json({ scores });
});

router.post('/scores', async (req, res) => {
  const { score, highScore, maxCombo, levelReached, victory, elapsedSec, enemiesDefeated, damageTaken, petId } =
    req.body;
  const saved = await GameScore.create({
    userId: req.user?.id,
    score: Number(score) || 0,
    highScore: Number(highScore) || 0,
    maxCombo: Number(maxCombo) || 0,
    levelReached: Number(levelReached) || 1,
    victory: Boolean(victory),
    elapsedSec: Number(elapsedSec) || 0,
    enemiesDefeated: Number(enemiesDefeated) || 0,
    damageTaken: Number(damageTaken) || 0,
    petId,
  });
  res.status(201).json(saved);
});

export default router;
```

---

## Opción 2: Servir el build compilado (`dist/`) desde tu mismo servidor Express

1. Ejecutá `npm run build` en este repositorio. Se genera `dist/` con rutas relativas (`base: './'`), todas las imágenes, scripts, audio (`dist/assets/audio/`) y video (`dist/assets/video/`).
2. Copiá el contenido de `dist/` a `server/public/juego/` en tu backend Express y servilo así:

```js
import path from 'path';
import express from 'express';

app.use('/juego', express.static(path.resolve('server/public/juego')));
app.get('/juego/*', (_req, res) => {
  res.sendFile(path.resolve('server/public/juego/index.html'));
});
```
