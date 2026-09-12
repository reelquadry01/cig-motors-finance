import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the same build works at a root domain (Cloudflare Pages,
// project.pages.dev) and at a sub-path (GitHub Pages). Runtime data fetch uses
// import.meta.env.BASE_URL, which resolves to './' here.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 3000, open: true },
})
