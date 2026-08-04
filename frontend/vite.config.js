import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GramMitra',
        short_name: 'GramMitra',
        theme_color: '#2E7D32',
        background_color: '#FAFAF7',
        display: 'standalone',
        start_url: '/',
      },
    }),
  ],
})
