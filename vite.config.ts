import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/libTrack/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'LibTrack',
        short_name: 'LibTrack',
        description: 'Track your library books, borrows, and holds',
        theme_color: '#4361ee',
        background_color: '#f8f9fa',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
