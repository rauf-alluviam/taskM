import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: 'VITE_',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  build: {
    rollupOptions: {
      input: {
        main: '/src/main.tsx'
      }
    }
  }
});