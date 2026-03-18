import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3002,
    proxy: {
      '/gitlab-api': {
        target: process.env.VITE_GITLAB_BASE_URL || 'https://devcloud.ubs.net/api/v4',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gitlab-api/, ''),
        secure: false,
      },
    },
  },
});
