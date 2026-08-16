import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/app/', // ★追加箇所：エックスサーバーに作るフォルダ名に合わせます
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'local_hospital_48dp.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'NurseFlowApp 看護師タスク管理',
        short_name: 'NurseFlow',
        description: 'リアルタイム看護タスク・タイムライン・割り込み管理PWAアプリ',
        theme_color: '#0284c7',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/app/',      // ★変更箇所：'/' から変更します
        start_url: '/app/',  // ★変更箇所：'/' から変更します
        icons: [
          {
            src: '/app/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/app/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/app/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('@dnd-kit')) {
              return 'vendor-dnd';
            }
            return 'vendor';
          }
        },
      },
    },
  },
})
