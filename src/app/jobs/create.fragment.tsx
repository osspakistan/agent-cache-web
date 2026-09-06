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
