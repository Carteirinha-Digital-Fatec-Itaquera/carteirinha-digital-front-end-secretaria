import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      devOptions: {
        enabled: true
      },

      manifest: {
        name: 'Sistema da Secretaria Fatec',
        short_name: 'Secretaria',
        description: 'Sistema da secretaria',
        theme_color: '#005C6D',
        background_color: '#e7e7e7',
        display: 'standalone',

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
       workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'], 
      },
    })
  ]
})