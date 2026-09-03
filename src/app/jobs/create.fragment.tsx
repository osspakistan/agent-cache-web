import { createNewJob } from '../../features/jobs'
import type { AppContext } from '../../lib/utils/types'

/**
 * POST /jobs/create — creates the job record in Turso DB + disk, then redirects to /dingdong/ac-{id}
 */
export const POST = async (c: AppContext) => {
  const log = c.get('log')
  const form = await c.req.parseBody()
  const rawUrl = String(form.docs ?? '').trim()

  if (!rawUrl) {
    return c.html(
      <p class="exp-note" role="alert">
        <b>paste a docs url first.</b>
      </p>,
      400,
    )
  }

  log.set({ url: rawUrl })

  try {
    const job = await createNewJob(rawUrl)
    const targetUrl = `/dingdong/${job.id}`

    if (c.req.header('HX-Request')) {
      // HTMX client-side redirect
      c.header('HX-Redirect', targetUrl)
      return c.text('', 200)
    }

    // Standard no-JS form redirect
    return c.redirect(targetUrl, 303)
  } catch (err: any) {
    console.error('[Jobs/Create] Failed to create job:', err)
    return c.html(
      <p class="exp-note" role="alert">
        <b>Failed to start extraction:</b> {err?.message || 'Server error'}
      </p>,
      500,
    )
  }
}
