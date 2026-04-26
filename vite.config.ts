import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
  plugins: [
    react(),
    federation({
      name: 'frameEngg',
      filename: 'remoteEntry.js',
      // What this app exposes to the shell
      exposes: {
        './App': './src/FederatedApp.tsx',
      },
      // Shared dependencies (singleton = only one instance)
      shared: ['react', 'react-dom', 'zustand'],
    }),
  ],

  base: '/frame/',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 3002,
    host: '0.0.0.0',
    allowedHosts: true,
    cors: true,

    proxy: {
      '/gitlab-api': {
        target: env.VITE_GITLAB_BASE_URL || 'https://devcloud.ubs.net/api/v4',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/gitlab-api/, ''),
        secure: false,
      },
      // DocMining backend — DEV/PREVIEW ONLY proxy.
      //
      // The browser calls the relative path `/api/docmining/convert`; this proxy
      // rewrites it to `${VITE_DOCMINING_BASE_URL || http://localhost:8000}/api/v1/documents/convert`.
      //
      // PRODUCTION: Vite does NOT bundle this proxy. Deployments must provide
      // same-origin ingress (e.g., nginx / kubernetes ingress / federation shell)
      // that forwards `/api/docmining/*` to the FastAPI service. Without it, the
      // upload feature will 404 silently. See `docs/knowledge/services/docmining/docminingClient.md`.
      '/api/docmining': {
        target: env.VITE_DOCMINING_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/docmining/, '/api/v1/documents'),
        secure: false,
      },
    },
  },

  preview: {
    port: 3002,
    host: '0.0.0.0',
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
};
});
