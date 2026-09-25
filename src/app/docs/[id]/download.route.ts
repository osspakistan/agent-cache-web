import { getJobById } from '../../../features/jobs'
import { getFromR2, getPublicR2Url, trackEvent } from '../../../lib/clients'
import {
  detectClientType,
  parseGeoHeaders,
  parseUserAgent,
} from '../../../lib/utils/analytics-detect'
import type { AppContext } from '../../../lib/utils/types'

export const GET = async (c: AppContext) => {
  const id = c.req.param('id') || ''
  const job = await getJobById(id)

  if (!job) {
    return c.text('Not found', 404)
  }

  // Track zip_download event
  const ua = c.req.header('user-agent') || ''
  const accept = c.req.header('accept') || ''
  const clientType = detectClientType(ua, accept)
  const { os, browser, deviceType } = parseUserAgent(ua)
  const { countryCode, countryName, city } = parseGeoHeaders(c.req.raw.headers)
  const cookieHeader = c.req.header('cookie') || ''
  const sessionMatch = cookieHeader.match(/ac_sid=([a-zA-Z0-9_-]+)/)
  const sessionId = sessionMatch
    ? sessionMatch[1]
    : `s_${Math.random().toString(36).substring(2, 12)}`

  trackEvent({
    sessionId,
    eventType: 'zip_download',
    clientType,
    path: `/docs/${id}/download`,
    actionLabel: `download_zip:${job.product_name || id}`,
    countryCode,
    countryName,
    city,
    os,
    browser,
    deviceType,
  }).catch(() => {})

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
