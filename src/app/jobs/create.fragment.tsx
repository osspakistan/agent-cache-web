import { PillForm } from '../../components/pill-form'
import { startJobEngine } from '../../features/engine'
import { createNewJob } from '../../features/jobs'
import { trackEvent } from '../../lib/clients'
import { detectClientType, parseGeoHeaders, parseUserAgent } from '../../lib/utils/analytics-detect'
import type { AppContext } from '../../lib/utils/types'

function isValidDocsUrl(input: string): boolean {
  try {
    const parsed = new URL(input)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false

    const hostname = parsed.hostname.toLowerCase()
    // Disallow empty host or single-character gibberish
    if (!hostname || hostname.length < 3) return false

    // Allow localhost or local IP for dev testing
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true

    // Must contain at least one dot separating domain and TLD (e.g. paddle.com, foo.dev)
    if (!hostname.includes('.')) return false

    const parts = hostname.split('.')
    const tld = parts[parts.length - 1]
    // Valid public TLD must be at least 2 alpha characters
    if (!tld || !/^[a-z]{2,}$/i.test(tld)) return false

    // Check each subdomain / domain label is a valid DNS label (alphanumeric with hyphens)
    for (const part of parts) {
      if (!part || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(part)) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

import { detectParkedDomain } from '../../lib/utils/parking'

async function probeDomainReachability(
  targetUrl: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const result = await detectParkedDomain(targetUrl)
    if (result.isParked) {
      return {
        ok: false,
        message: result.message,
      }
    }
    return { ok: true }
  } catch {
    return { ok: true }
  }
}

/**
 * POST /jobs/create - creates the job record in Turso DB + disk, then redirects to /dingdong/ac-{id}
 */
export const POST = async (c: AppContext) => {
  const log = c.get('log')
  const form = await c.req.parseBody()
  const rawInput = String(form.docs ?? '').trim()

  if (!rawInput) {
    return c.html(
      <PillForm errorMessage="You literally submitted nothing. Paste an actual docs URL." />,
      400,
    )
  }

  // Prepend https:// if user pasted bare domain or path (e.g. paddle.com or stripe.com/docs)
  const normalizedUrl = /^https?:\/\//i.test(rawInput) ? rawInput : `https://${rawInput}`

  if (!isValidDocsUrl(normalizedUrl)) {
    return c.html(
      <PillForm
        defaultValue={rawInput}
        errorMessage={`"${rawInput}" is not a website. Try typing a real domain like paddle.com or stripe.com.`}
      />,
      400,
    )
  }

  // Probe domain reachability (DNS + HTTP parking check) before burning DB or LLM resources
  const reachability = await probeDomainReachability(normalizedUrl)
  if (!reachability.ok) {
    return c.html(
      <PillForm
        defaultValue={rawInput}
        errorMessage={
          reachability.message || `Couldn't reach "${rawInput}". It's either dead or imaginary.`
        }
      />,
      400,
    )
  }

  const rawUrl = normalizedUrl

  log.set({ url: rawUrl })

  try {
    const job = await createNewJob(rawUrl)
    startJobEngine(job).catch((err) =>
      console.error('[Jobs/Create] Background engine runner error:', err),
    )

    // Track analytics event
    const ua = c.req.header('user-agent') || ''
    const accept = c.req.header('accept') || ''
    const clientType = detectClientType(ua, accept)
    const { os, browser, deviceType } = parseUserAgent(ua)
    const { countryCode, countryName, city } = parseGeoHeaders(c.req.raw.headers)
    const cookieHeader = c.req.header('cookie') || ''
    const sessionMatch = cookieHeader.match(/ac_sid=([a-zA-Z0-9_-]+)/)
    const sessionId = sessionMatch ? sessionMatch[1] : `s_${job.id}`

    trackEvent({
      sessionId,
      eventType: 'job_create',
      clientType,
      path: '/',
      actionLabel: `crawl_submitted:${new URL(rawUrl).hostname.replace(/^www\./, '')}`,
      countryCode,
      countryName,
      city,
      os,
      browser,
      deviceType,
    }).catch(() => {})

    const targetUrl = `/dingdong/${job.id}`

    if (c.req.header('HX-Request')) {
      // HTMX client-side redirect
      c.header('HX-Redirect', targetUrl)
      return c.text('', 200)
    }

    // Standard no-JS form redirect
    return c.redirect(targetUrl, 303)
  } catch (err: unknown) {
    console.error('[Jobs/Create] Failed to create job:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return c.html(
      <PillForm defaultValue={rawInput} errorMessage={`Failed to start extraction: ${message}`} />,
      500,
    )
  }
}
