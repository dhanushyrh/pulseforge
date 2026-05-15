import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react({})],
  root: path.resolve(__dirname),
  server: {
    port: 4000,
    proxy: {
      '/v1': 'http://localhost:3000',   // proxy API calls to gateway
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../../dist/ui'),
  },
});