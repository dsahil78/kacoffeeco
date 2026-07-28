import { createApp } from '../server/app.js'

/**
 * Vercel serverless entrypoint. An Express app is already a (req, res) handler,
 * so exporting it directly is all Vercel needs. `vercel.json` rewrites
 * /api/* here, and the app mounts its routes under /api to match.
 */
export default createApp()
