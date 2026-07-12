import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
//
// No `test` field here on purpose: vitest bundles its own internal copy of
// vite, and mixing that with plugins typed against the top-level vite
// breaks `tsc -b`'s strict project-reference type checking. Vitest's own
// config (vitest.config.ts) is picked up in preference to this file when
// running tests, so the two never need to share a type-checked object.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'KoropePulse',
        short_name: 'KoropePulse',
        description: "Live shuttle status and driver check-ins for UNILAG's transit network.",
        theme_color: '#1b2a4a',
        background_color: '#1b2a4a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            // Firebase RTDB traffic is handled by the SDK's own offline
            // cache; the service worker only needs to keep the app shell
            // available so the UI can render its "reconnecting" state.
            urlPattern: ({ url }) => url.origin.includes('firebaseio.com'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
