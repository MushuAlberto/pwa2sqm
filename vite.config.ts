
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.resolve();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  return {
    base: './',
    plugins: [react()],
    define: {
      'process.env.VITE_OPENROUTER_API_KEY': JSON.stringify(env.VITE_OPENROUTER_API_KEY || ""),
      'process.env.VITE_OPENROUTER_MODEL': JSON.stringify(env.VITE_OPENROUTER_MODEL || "minimax/minimax-m2.5:free"),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('xlsx')) return 'vendor-excel';
              if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
              return 'vendor-core';
            }
          },
        },
      },
    },
  };
});
