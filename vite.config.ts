import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'src/main/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'node-pty'],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'src/preload/preload.ts'),
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: 'preload.cjs',
              },
            },
          },
        },
      },
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: [
      '@codingame/monaco-vscode-theme-defaults-default-extension',
      '@codingame/monaco-vscode-theme-seti-default-extension'
    ],
    include: [
      '@codingame/monaco-vscode-api',
      '@codingame/monaco-vscode-api/extensions',
      '@codingame/monaco-vscode-workbench-service-override',
      '@codingame/monaco-vscode-files-service-override',
      '@codingame/monaco-vscode-theme-service-override',
      '@codingame/monaco-vscode-textmate-service-override',
      '@codingame/monaco-vscode-layout-service-override',
      '@codingame/monaco-vscode-views-service-override',
      '@codingame/monaco-vscode-editor-service-override',
      '@codingame/monaco-vscode-quickaccess-service-override',
      '@codingame/monaco-vscode-explorer-service-override',
      '@codingame/monaco-vscode-environment-service-override',
      '@codingame/monaco-vscode-keybindings-service-override',
      '@codingame/monaco-vscode-dialogs-service-override',
      '@codingame/monaco-vscode-lifecycle-service-override',
      '@codingame/monaco-vscode-configuration-service-override'
    ]
  },
  server: {
    port: 5173,
  },
});
