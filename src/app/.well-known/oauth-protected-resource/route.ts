import { join } from 'node:path'
import type { AppContext } from '../../../lib/utils/types'

/**
 * GET /.well-known/oauth-protected-resource
 * RFC 9728 OAuth Protected Resource Metadata
 */
export const GET = async (_c: AppContext) => {
  const file = Bun.file(join(process.cwd(), 'public/.well-known/oauth-protected-resource'))
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
  return new Response(JSON.stringify({ error: 'not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
}
