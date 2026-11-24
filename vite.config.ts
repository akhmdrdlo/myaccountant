import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
          date: ['date-fns'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
      includeAssets: ['banklogo.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        id: '/',
        name: 'Rplanner — Catatan Keuangan',
        short_name: 'Rplanner',
        description: 'Your Cash, Your Control. Catat pemasukan, pengeluaran, budget, dan tagihan.',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0B3C7A',
        background_color: '#F4F7FB',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Catat transaksi', short_name: 'Catat', url: '/?action=add', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Transaksi terdeteksi', short_name: 'Inbox', url: '/?view=inbox', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
        // "Bagikan → Rplanner" dari notifikasi bank, SMS, atau email
        share_target: {
          action: '/',
          method: 'GET',
          params: { title: 'share_title', text: 'share_text', url: 'share_url' },
        },
      },
    }),
  ],
})
