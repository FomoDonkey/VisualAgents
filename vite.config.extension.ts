import { defineConfig } from 'vite';

/**
 * Vite config for building the game as a single JS bundle
 * to embed inside the VS Code / Antigravity webview.
 *
 * Output: extension/dist-webview/visualagents.js
 */
export default defineConfig({
  base: './',
  build: {
    outDir: 'extension/dist-webview',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.ts',
      output: {
        entryFileNames: 'visualagents.js',
        // Bundle everything into a single file
        manualChunks: undefined,
        inlineDynamicImports: true,
      },
    },
    // Inline all small assets
    assetsInlineLimit: 100000,
    sourcemap: false,
    minify: 'esbuild',
  },
  // No server plugin needed for the webview build
  plugins: [],
});
