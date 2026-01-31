import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Use path.resolve() to get the current working directory safely
const __dirname = path.resolve();

export default defineConfig(({ mode }) => {
  // Use the resolved __dirname instead of process.cwd() to resolve the TypeScript error
  const env = loadEnv(mode, __dirname, '');

  return {
    // IMPORTANTE: base './' permite que la app funcione en subcarpetas de GitHub Pages
    base: './',
    plugins: [react()],
    define: {
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
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
              if (id.includes('@google/genai')) return 'vendor-ai';
              return 'vendor-core';
            }
          },
        },
      },
    },
  };
});
