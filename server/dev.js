import { createApp } from './app.js'
import { config, missingConfig } from './config.js'

/**
 * Local dev server. Vite proxies /api to this process (see vite.config.js), so
 * the browser only ever talks to one origin.
 */
const app = createApp()

app.listen(config.port, () => {
  console.log(`  api    ready on http://localhost:${config.port}/api`)

  const missing = missingConfig()
  if (missing.length) {
    console.warn(`  api    missing env: ${missing.join(', ')}`)
    console.warn('  api    copy .env.example to .env and fill it in before checking out')
  }
})
