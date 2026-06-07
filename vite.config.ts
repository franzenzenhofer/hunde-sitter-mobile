import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Hunde-Sitter Mobile',
        short_name: 'HundeSitter',
        description: 'Cozy dog-sitter adventure in an endless world',
        theme_color: '#87ceeb',
        background_color: '#87ceeb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Never serve a stale app. Hashed JS/CSS are immutable so they're safe to
        // precache; the HTML is deliberately NOT precached and is fetched
        // network-first, so an online visitor always gets the newest index.html
        // (and therefore the newest hashed assets). The new SW also takes control
        // immediately (skipWaiting + clientsClaim) and old caches are purged.
        globPatterns: ['**/*.{js,css,svg,png,ico,webmanifest,mp3,ogg}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Always go to the network for the page itself; fall back to cache
            // only when offline (a stale page is never preferred while online).
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 4 },
            },
          },
          {
            urlPattern: /\.(?:mp3|ogg|wav)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: { host: true },
});
