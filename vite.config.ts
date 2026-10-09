import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: '爸妈节奏操',
        short_name: '爸妈节奏操',
        description: '像素爸爸妈妈陪你做操的音乐节奏游戏',
        theme_color: '#2b1d3a',
        background_color: '#2b1d3a',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json,ogg,mp3,wav}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html'
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 2000
  }
})
