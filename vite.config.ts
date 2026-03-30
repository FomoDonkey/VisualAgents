import { defineConfig } from 'vite';
import { visualAgentsApi } from './server/vite-plugin';

export default defineConfig({
  base: './',
  plugins: [visualAgentsApi()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
