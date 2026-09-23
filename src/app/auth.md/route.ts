import { join } from 'node:path'
import type { AppContext } from '../../lib/utils/types'

/**
 * GET /auth.md
 * Serves Auth.md with proper text/markdown; charset=utf-8 Content-Type.
 */
export const GET = async (_c: AppContext) => {
  const file = Bun.file(join(process.cwd(), 'public/auth.md'))
  if (await file.exists()) {
    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
  return new Response('# auth.md\n\nAgent Cache authentication instructions.\n', {
    status: 200,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
