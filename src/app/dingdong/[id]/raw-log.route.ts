import { getJobById } from '../../../features/jobs'
import { readRawLogsFromR2 } from '../../../lib/clients'
import type { AppContext } from '../../../lib/utils/types'

export const GET = async (c: AppContext) => {
  const id = c.req.param('id') || ''
  const [logs, job] = await Promise.all([readRawLogsFromR2(id), getJobById(id)])

  const header = job
    ? `=== Job ID: ${job.id} | Target URL: ${job.input_url} ===\n\n`
    : `=== Job ID: ${id} ===\n\n`

  return c.text(header + logs, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
  })
}
