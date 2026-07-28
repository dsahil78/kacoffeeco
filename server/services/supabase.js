import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

/**
 * Service-role Supabase client. Bypasses RLS, so it is the only thing in this
 * codebase allowed to read or write payment data — and it never leaves the
 * server. Created lazily so importing this module doesn't blow up when the
 * environment is unconfigured (the health endpoint still needs to respond).
 *
 * The client is stateless over HTTP/PostgREST, which is what we want on
 * serverless: no connection pool to leak between invocations.
 */
let client = null

export function supabase() {
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-application-name': 'kick-ass-coffee' } },
    })
  }
  return client
}

/** Unwraps a PostgREST result, turning its error into a thrown Error. */
export function unwrap({ data, error }, context) {
  if (error) {
    const err = new Error(`${context}: ${error.message}`)
    err.cause = error
    throw err
  }
  return data
}
