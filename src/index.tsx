/**
 * Entrypoint. Boots the file-based app:
 *   evlog: request-scoped structured logging (one wide event per request)
 *   scanner registers src/app/** → Hono routes
 *   public/ is served as-is
 *   job artifacts live under storage/jobs/ (gitignored)
 *
 * Port: .env (Bun auto-loads it) → PORT.
 */
import { join } from 'node:path'
import './lib/utils/logger' // initLogger at boot - side-effect import, safe re-entrance
import { evlog } from 'evlog/hono'
import { serveStatic } from 'hono/bun'
import { buildApp } from './router/build'

const PORT = Number(process.env.PORT ?? 10901)

const app = await buildApp(join(import.meta.dir, 'app'), {
  middleware: [evlog()],
})

// htmx served from the npm package (htmx.org@4) - no vendored copies
app.get('/js/htmx.esm.min.js', serveStatic({ path: 'node_modules/htmx.org/dist/htmx.esm.min.js' }))

// RFC 8288 Link header middleware for Agent Discovery
const DISCOVERY_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</openapi.json>; rel="service-desc"; type="application/json"',
  '</llms.txt>; rel="service-doc"',
  '</.well-known/ai-catalog.json>; rel="ai-catalog"',
  '</.well-known/agent-skills/index.json>; rel="describedby"',
].join(', ')

app.use('*', async (c, next) => {
  await next()
  if (c.req.path === '/' && c.req.method === 'GET') {
    c.header('Link', DISCOVERY_LINK_HEADER)
  }
})

// static assets - serveStatic passes through to routes when a file doesn't exist
app.use('/*', serveStatic({ root: './public' }))

console.log(`[agent-cache-web] routes registered, listening on :${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
  idleTimeout: 255, // Max Bun idle timeout (seconds) for streaming SSE
}
