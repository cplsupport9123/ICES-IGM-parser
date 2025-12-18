import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'IGM Viewer & Generator',
        short_name: 'IGM App',
        start_url: '.',
        display: 'standalone',
        background_color: '#ED1C24',
        theme_color: '#ED1C24',
        description: 'Parse, view, and generate ICES IGM files offline.',
        icons: [
          {
            src: './src/assets/logo.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
          },
          {
            src: './src/assets/logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      },
    }),
  ],
})
