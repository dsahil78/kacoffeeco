import express from 'express'
import { missingConfig } from './config.js'
import { payments } from './routes/payments.js'
import { webhooks } from './routes/webhooks.js'

/**
 * The Express app, shared by the local dev server and the Vercel serverless
 * function. Stateless by construction: no sessions, no in-memory caches, no
 * long-lived connections — every request stands alone.
 *
 * Routes are mounted under /api because Vercel forwards the original path to
 * the function, so `req.url` is `/api/...` in production too.
 */
export function createApp() {
  const app = express()
  app.disable('x-powered-by')

  // The webhook router installs its own raw-body parser, so it must be mounted
  // before express.json() gets a chance to consume the stream.
  app.use('/api', webhooks)
  app.use('/api', express.json({ limit: '100kb' }))
  app.use('/api', payments)

  app.get('/api/health', (_req, res) => {
    const missing = missingConfig()
    res.json({ ok: missing.length === 0, missing_env: missing })
  })

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }))

  // eslint-disable-next-line no-unused-vars -- Express identifies error
  // handlers by arity; the `next` parameter must stay.
  app.use((error, _req, res, _next) => {
    const status = error.statusCode ?? 500
    if (status >= 500) console.error('[api]', error)
    else console.warn('[api]', error.message)

    // Never leak internals: `publicMessage` is the allowlist, and anything else
    // collapses to a generic string. Stack traces and provider errors stay in
    // the logs where they belong.
    res.status(status).json({
      error:
        error.publicMessage ??
        (status >= 500 ? 'Something went wrong on our end. Please try again.' : error.message),
    })
  })

  return app
}
