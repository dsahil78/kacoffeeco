import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Express app runs on PORT (default 3001) in dev; on Vercel the same app is
// mounted at /api as a serverless function. Proxying here keeps client code
// identical in both environments — it always calls same-origin /api.
const proxy = {
  '/api': {
    target: `http://localhost:${process.env.PORT || 3001}`,
    changeOrigin: false,
  },
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  // `vite preview` gets the same proxy so a production build can be exercised
  // against the real API before deploying.
  preview: { port: 4173, proxy },
})
