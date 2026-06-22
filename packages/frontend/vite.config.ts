import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

function getVersion(): string {
  try {
    if (process.env.APP_VERSION) return `v${process.env.APP_VERSION}`;
    const versionFile = path.join(__dirname, '.version');
    try {
      return readFileSync(versionFile, 'utf-8').trim();
    } catch {}
    const date = execSync('git log -1 --format=%cd --date=format:%Y%m%d').toString().trim();
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    return `v${date}-${hash}`;
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
