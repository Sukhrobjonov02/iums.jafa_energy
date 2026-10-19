import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dns from 'dns'

// Set DNS resolution order to prefer IPv4
dns.setDefaultResultOrder('ipv4first')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      '@components': path.resolve(process.cwd(), './src/components'),
      '@api': path.resolve(process.cwd(), './src/api'),
      '@types': path.resolve(process.cwd(), './src/types'),
      '@pages': path.resolve(process.cwd(), './src/pages'),
      '@service': path.resolve(process.cwd(), './src/service'),
    },
  },
  build: {
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Optimize bundle splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          // State management and data fetching
          'data-vendor': ['@tanstack/react-query', 'zustand', 'axios'],
          // Utilities
          'utils-vendor': ['dayjs', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          // Icons and animations
          'media-vendor': ['lucide-react', 'lottie-react'],
        },
        // Naming pattern for chunks
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        // Temporarily keep console logs for debugging
        drop_console: false,
        drop_debugger: false,
        // pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      format: {
        comments: false,
      },
    },
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      '@tanstack/react-query',
      'axios',
    ],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        // The dev proxy pointed at the production server's public IP on port 3000. That port
        // is closed to the internet now, so npm run dev could not reach any backend at all.
        // Defaults to a local backend; set VITE_PROXY_TARGET to point somewhere else.
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('🚫 Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🚀 Sending Request:', req.method, req.url, '→', proxyReq.getHeader('host'));
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('📥 Response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
})