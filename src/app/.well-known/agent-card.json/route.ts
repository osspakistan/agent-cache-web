import { join } from 'node:path'
import type { AppContext } from '../../../lib/utils/types'

/**
 * GET /.well-known/agent-card.json
 * Serves the A2A Agent Card directly for agent discovery.
 */
export const GET = async (_c: AppContext) => {
  const file = Bun.file(join(process.cwd(), 'public/.well-known/agent-card.json'))
  if (await file.exists()) {
    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
  return new Response(JSON.stringify({ error: 'agent card not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
}
