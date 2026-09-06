import { PillForm } from '../../components/pill-form'
import { startJobEngine } from '../../features/engine'
import { createNewJob } from '../../features/jobs'
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

import dns from 'node:dns/promises'

async function probeDomainReachability(
  targetUrl: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const host = new URL(targetUrl).hostname.toLowerCase()

    // 1. DNS Resolution Probe (< 40ms)
    if (host !== 'localhost' && host !== '127.0.0.1') {
      try {
        await dns.lookup(host)
      } catch (dnsErr: unknown) {
        const code = (dnsErr as { code?: string }).code
        if (code === 'ENOTFOUND' || code === 'NODATA') {
          return {
            ok: false,
            message: `Could not find DNS records for "${host}". Check the spelling or make sure the site is online.`,
          }
        }
      }
    }

    // 2. Fast HTTP probe to check connection and detect dead or parked domains (< 3.5s)
    try {
      const probeRes = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(3500),
        redirect: 'follow',
      })

      const finalUrl = (probeRes.url || '').toLowerCase()
      const text = await probeRes.text()
      const lower = text.toLowerCase()

      const isParked =
        finalUrl.includes('godaddy') ||
        finalUrl.includes('sedo') ||
        finalUrl.includes('dan.com') ||
        finalUrl.includes('parking') ||
        finalUrl.includes('afternic') ||
        lower.includes('window.location.href="/lander"') ||
        lower.includes("window.location.href='/lander'") ||
        lower.includes('domain is for sale') ||
        lower.includes('buy this domain') ||
        lower.includes('parked domain') ||
        lower.includes('domain has expired') ||
        lower.includes('is available for purchase')

      if (isParked) {
        return {
          ok: false,
          message: `"${host}" appears to be an inactive or parked domain.`,
        }
      }

      if (probeRes.status === 410) {
        return {
          ok: false,
          message: `"${host}" returned HTTP 410 Gone. The site is no longer active.`,
        }
      }
    } catch (httpErr: unknown) {
      const msg = httpErr instanceof Error ? httpErr.message : String(httpErr)
      if (/ENOTFOUND|getaddrinfo|EAI_AGAIN/i.test(msg)) {
        return {
          ok: false,
          message: `Could not find DNS records for "${host}". Check the spelling or make sure the site is online.`,
        }
      }
      if (/ECONNREFUSED|ConnectionRefused/i.test(msg)) {
        return {
          ok: false,
          message: `Connection refused by "${host}". The server is not accepting web traffic.`,
        }
      }
    }

    return { ok: true }
  } catch {
    return { ok: true }
  }
}

/**
 * POST /jobs/create — creates the job record in Turso DB + disk, then redirects to /dingdong/ac-{id}
 */
export const POST = async (c: AppContext) => {
  const log = c.get('log')
  const form = await c.req.parseBody()
  const rawInput = String(form.docs ?? '').trim()

  if (!rawInput) {
    return c.html(
      <PillForm errorMessage="Paste a docs URL or domain first (e.g. paddle.com or docs.stripe.com)." />,
      400,
    )
  }

  // Prepend https:// if user pasted bare domain or path (e.g. paddle.com or stripe.com/docs)
  const normalizedUrl = /^https?:\/\//i.test(rawInput) ? rawInput : `https://${rawInput}`

  if (!isValidDocsUrl(normalizedUrl)) {
    return c.html(
      <PillForm
        defaultValue={rawInput}
        errorMessage={`"${rawInput}" doesn't look like a valid domain or URL. Try something like paddle.com or docs.hono.dev.`}
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
        errorMessage={reachability.message || `Could not connect to "${rawInput}".`}
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
