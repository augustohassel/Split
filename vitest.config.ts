import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/test/**',
        'src/main.tsx',
        'src/types/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        'vite.config.ts',
        'vitest.config.ts',
        'eslint.config.js',
        'postcss.config.js',
        'tailwind.config.js',
      ],
    },
  },
});
