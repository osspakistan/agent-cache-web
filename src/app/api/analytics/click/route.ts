import { trackEvent } from '../../../../lib/clients'
import {
  detectClientType,
  parseGeoHeaders,
  parseUserAgent,
} from '../../../../lib/utils/analytics-detect'
import type { AnalyticsEventType, AppContext } from '../../../../lib/utils/types'

/**
 * POST /api/analytics/click - Record client-side user interactions & button clicks
 * Body: { event_type?: string, action_label: string, path?: string }
 */
export const POST = async (c: AppContext) => {
  let eventType: AnalyticsEventType = 'click'
  let actionLabel = ''
  let path = ''

  const cType = c.req.header('content-type') || ''
  if (cType.includes('application/json')) {
    try {
      const body = (await c.req.json()) as {
        event_type?: AnalyticsEventType
        action_label?: string
        path?: string
      }
      eventType = body.event_type || 'click'
      actionLabel = String(body.action_label || '').trim()
      path = String(body.path || '').trim()
    } catch {}
  }

  if (!actionLabel) {
    return c.json({ ok: false, error: 'Missing action_label' }, 400)
  }

  const ua = c.req.header('user-agent') || ''
  const accept = c.req.header('accept') || ''
  const clientType = detectClientType(ua, accept)
  const { os, browser, deviceType } = parseUserAgent(ua)
  const { countryCode, countryName, city } = parseGeoHeaders(c.req.raw.headers)
  const referrer = c.req.header('referer') || undefined

  const cookieHeader = c.req.header('cookie') || ''
  const sessionMatch = cookieHeader.match(/ac_sid=([a-zA-Z0-9_-]+)/)
  const sessionId = sessionMatch
    ? sessionMatch[1]
    : `s_${Math.random().toString(36).substring(2, 12)}`

  trackEvent({
    sessionId,
    eventType,
    clientType,
    path: path || '/',
    actionLabel,
    referrer,
    countryCode,
    countryName,
    city,
    os,
    browser,
    deviceType,
  }).catch((err) => console.error('[Analytics] Failed to track action event:', err))

  return c.json({ ok: true })
}
