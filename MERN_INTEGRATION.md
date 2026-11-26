# Instalación de Dionaea Strike en una Web MERN (MongoDB + Express + React + Node)

Dionaea Strike ya está auditado y empaquetado para integrarse sin fricción en cualquier aplicación **MERN** mediante dos opciones:

---

## Opción 1 (Recomendada): Integrarlo como componente React dentro de tu cliente MERN

### 1. Copiar archivos al frontend React (`client/`)
Copia estas carpetas en tu proyecto React:
- `src/components/`, `src/game/`, `src/assets/images/`, `src/dionaea-embed.ts`, `src/index.css` → `client/src/games/dionaea-strike/`
- `public/assets/aistudio/` (las pistas `.m4a` de música) → `client/public/assets/aistudio/`

Dependencias mínimas requeridas en `client/package.json`:
```bash
npm install lucide-react
```
*(El juego utiliza Tailwind CSS v4 y Canvas 2D nativo; no necesita motores externos pesados ni API keys.)*

### 2. Montar el componente en una ruta de React (ej. `/juego`)
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
      isAdmin={currentUser?.role === 'admin'}
      initialConfig={serverConfig}
      onConfigChange={handleSaveAdminConfig}
      onScoreSubmit={handleScoreSubmit}
      assetBasePath="/"
    />
  );
}
```

### 3. Endpoints Express + Modelos Mongoose (`server/`)
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

// Ranking Top 20
router.get('/scores/top', async (_req, res) => {
  const scores = await GameScore.find().sort({ score: -1 }).limit(20).populate('userId', 'name');
  res.json({ scores });
});

// Guardar partida al terminar (onScoreSubmit)
router.post('/scores', async (req, res) => {
  const { score, highScore, maxCombo, levelReached, victory, elapsedSec, enemiesDefeated, petId } = req.body;
  const saved = await GameScore.create({
    userId: req.user?.id,
    score: Number(score) || 0,
    highScore: Number(highScore) || 0,
    maxCombo: Number(maxCombo) || 0,
    levelReached: Number(levelReached) || 1,
    victory: Boolean(victory),
    elapsedSec: Number(elapsedSec) || 0,
    enemiesDefeated: Number(enemiesDefeated) || 0,
    petId,
  });
  res.status(201).json(saved);
});

export default router;
```

---

## Opción 2: Servir el build compilado (`dist/`) directamente desde Express

1. Ejecuta `npm run build` en este proyecto. Todas las imágenes y scripts quedan empaquetados en `dist/` junto con las pistas de audio en `dist/assets/aistudio/`.
2. Copia la carpeta `dist/` a tu backend Express (por ejemplo `server/public/dionaea/`) y móntala así:

```js
import path from 'path';
import express from 'express';

app.use('/juego', express.static(path.resolve('server/public/dionaea')));
app.get('/juego/*', (_req, res) => {
  res.sendFile(path.resolve('server/public/dionaea/index.html'));
});
```
*(Si montás bajo `/juego/`, compilá con `vite build --base=/juego/` o pasá `assetBasePath="/juego/"` en el componente.)*
