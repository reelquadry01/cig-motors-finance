import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Absolute base — the app is served from FastAPI at the root and the client-side
// router uses nested paths like /admin. A relative base breaks nested routes
// because the browser resolves `./assets/…` against the current URL, so from
// /admin it tries `/admin/assets/…` and 404s.
export default defineConfig({
  plugins: [react()],
  base: '/',
  // gzip-size reporting is memory hungry on large chunks and is cosmetic only
  build: { reportCompressedSize: false, chunkSizeWarningLimit: 1200 },
  server: { port: 3000, open: true },
})
