import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  const enablePwa = process.env.ENABLE_PWA === 'true';
  const plugins: PluginOption[] = [react(), tailwindcss()];

  if (enablePwa) {
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: './',
          name: 'Dionaea Strike — Escuadrón Pampa',
          short_name: 'Dionaea Strike',
          description:
            "Shoot 'em up aéreo estilo anime sobre la Tierra con biplano carnívoro, mascotas copiloto y armas rotativas.",
          theme_color: '#08101C',
          background_color: '#08101C',
          display: 'standalone',
          orientation: 'landscape',
          start_url: './',
          scope: './',
          icons: [
            {
              src: './pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: './pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: './pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      })
    );
  }

  return {
    base: './',
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      assetsInlineLimit: 4096,
      sourcemap: false,
    },
    server: {
      port: 3000,
    },
  };
});
