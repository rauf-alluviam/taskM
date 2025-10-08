import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No need to specify rollupOptions.input unless you have multiple HTML entry points
export default defineConfig({
  plugins: [react()],
  envPrefix: 'VITE_',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // target: 'http://localhost:5003',
        target: 'http://15.207.11.214:5003',
        changeOrigin: true,
      },
    },
  },
  define: {
    global: "window",
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  }
});
