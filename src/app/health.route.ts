import type { AppContext } from '../shared/types'

/** GET /health — JSON. Used by uptime checks; proves route.ts convention. */
export const GET = (c: AppContext) =>
  c.json({ ok: true, service: 'agent-cache-web', ts: new Date().toISOString() })
