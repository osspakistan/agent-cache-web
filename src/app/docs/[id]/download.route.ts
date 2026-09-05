import { getJobById } from '../../../features/jobs'
import { getFromR2, getPublicR2Url } from '../../../lib/clients'
import type { AppContext } from '../../../lib/utils/types'

export const GET = async (c: AppContext) => {
  const id = c.req.param('id') || ''
  const job = await getJobById(id)

  if (!job) {
    return c.text('Not found', 404)
  }

  // If public R2 URL is available, redirect directly to fast CDN edge
  const publicUrl =
    getPublicR2Url(`jobs/${id}/${id}.zip`) || getPublicR2Url(`jobs/${id}/bundle.zip`)
  if (publicUrl) {
    return c.redirect(publicUrl, 302)
  }

  // Fallback: Stream directly from R2
  let zipBytes = await getFromR2(`jobs/${id}/${id}.zip`)
  if (!zipBytes) {
    zipBytes = await getFromR2(`jobs/${id}/bundle.zip`)
  }

  if (!zipBytes) {
    return c.text('ZIP bundle not yet available in R2', 404)
  }

  const filename = `${id}.zip`

  return c.body(Buffer.from(zipBytes), 200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': zipBytes.byteLength.toString(),
  })
}
