import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Deliberately separate from vite.config.ts — see the comment there.
// vitest picks this file up in preference to vite.config.ts, so tests get
// their own self-consistent plugin/type universe (vitest's bundled vite).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
})
