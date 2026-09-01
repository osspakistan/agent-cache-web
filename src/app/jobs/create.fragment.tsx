import type { AppContext } from '../../shared/types'

/**
 * POST /jobs/create — the pill form's target (v2 preview stub's real replacement).
 * Scaffold state: captures the URL and returns the early-access note.
 * When the job pipeline lands: validate URL (f01) → modules/jobs.create() →
 * return job-status fragment instead.
 */
export const POST = async (c: AppContext) => {
  const log = c.get('log')
  const form = await c.req.parseBody()
  const url = String(form.docs ?? '').trim()
  log.set({ url })

  if (!url) {
    return c.html(
      <p class="exp-note" role="alert">
        <b>paste a docs url first.</b>
      </p>,
      400,
    )
  }

  // No-JS path: redirect back home (fragment target is replaced only via htmx)
  if (!c.req.header('HX-Request')) {
    return c.redirect(`/?captured=${encodeURIComponent(url)}`, 303)
  }

  // TODO(pipeline): modules/jobs.create(url) → return job-status fragment
  return c.html(
    <p class="exp-note">
      <b>url captured</b> ·{' '}
      <span class="mono" style="color:var(--ink)">
        {url}
      </span>{' '}
      · the web app ships with the backend. ping{' '}
      <a href="mailto:hi@agent-cache.dev" style="color:var(--accent-ink)">
        hi@agent-cache.dev
      </a>{' '}
      for early access.
    </p>,
  )
}
