import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase chunk - separate Firebase from main bundle
          'firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore'
          ],
          // Charts library - separate Recharts (large visualization library)
          'recharts': ['recharts'],
          // PDF generation - separate PDF libraries (loaded on demand)
          'pdf-libs': [
            'jspdf',
            'jspdf-autotable',
            'html2canvas'
          ],
          // React core - separate React and ReactDOM
          'react-vendor': [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          // UI library - separate UI components
          'ui-vendor': [
            'framer-motion',
            'lucide-react'
          ],
          // Date utilities - separate date libraries
          'date-utils': [
            'date-fns'
          ]
        }
      }
    },
    // Increase chunk size warning limit for the main bundle
    chunkSizeWarningLimit: 1000,
  }
}) 