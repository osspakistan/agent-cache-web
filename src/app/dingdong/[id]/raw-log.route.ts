import { readRawLogsFromR2 } from '../../../modules/storage/r2'
import type { AppContext } from '../../../shared/types'

export const GET = async (c: AppContext) => {
  const id = c.req.param('id') || ''
  const logs = await readRawLogsFromR2(id)
  return c.text(logs, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
  })
}
