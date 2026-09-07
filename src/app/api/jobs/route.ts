import { startJobEngine } from '../../../features/engine'
import { createNewJob, listCompletedJobs } from '../../../features/jobs'
import { detectParkedDomain } from '../../../lib/utils/parking'
import type { AppContext } from '../../../lib/utils/types'

/**
 * POST /api/jobs — Submit a new crawl job via JSON API
 * Body: { url: string }
 */
export const POST = async (c: AppContext) => {
  let targetUrl = ''

  const cType = c.req.header('content-type') || ''
  if (cType.includes('application/json')) {
    try {
      const body = (await c.req.json()) as { url?: string; docs?: string }
      targetUrl = String(body.url || body.docs || '').trim()
    } catch {}
  } else {
    try {
      const form = await c.req.parseBody()
      targetUrl = String(form.url || form.docs || '').trim()
    } catch {}
  }

  if (!targetUrl) {
    return c.json(
      {
        ok: false,
        error: 'Missing required field "url" in request body',
      },
      400,
    )
  }

  const normalizedUrl = /^https?:\/\//i.test(targetUrl) ? targetUrl : `https://${targetUrl}`
  const parkingCheck = await detectParkedDomain(normalizedUrl)
  if (parkingCheck.isParked) {
    return c.json(
      {
        ok: false,
        error: parkingCheck.message || 'Target domain is parked or inactive.',
        code: 'PARKED_DOMAIN',
      },
      400,
    )
  }

  try {
    const job = await createNewJob(normalizedUrl)

    // Launch engine in background
    startJobEngine(job).catch((err) =>
      console.error(`[API/Jobs] Background engine error for ${job.id}:`, err),
    )

    return c.json(
      {
        ok: true,
        job: {
          id: job.id,
          status: job.status,
          input_url: job.input_url,
          r2_prefix: job.r2_prefix,
          created_at: job.created_at,
        },
        links: {
          status: `/api/jobs/${job.id}`,
          tree: `/api/jobs/${job.id}/tree`,
          logs: `/dingdong/${job.id}/raw-log`,
          stream: `/dingdong/${job.id}/stream`,
          viewer: `/docs/${job.id}`,
          download: `/docs/${job.id}/download`,
        },
      },
      201,
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error creating job'
    return c.json({ ok: false, error: message }, 500)
  }
}

/**
 * GET /api/jobs — List recent completed jobs
 */
export const GET = async (c: AppContext) => {
  try {
    const jobs = await listCompletedJobs(20)
    return c.json({
      ok: true,
      jobs: jobs.map((j) => ({
        id: j.id,
        status: j.status,
        input_url: j.input_url,
        resolved_url: j.resolved_url,
        product_name: j.product_name,
        title: j.title,
        description: j.description,
        logo_url: j.logo_url,
        strategy: j.strategy,
        page_count: j.page_count,
        zip_size_bytes: j.zip_size_bytes,
        created_at: j.created_at,
        completed_at: j.completed_at,
        links: {
          viewer: `/docs/${j.id}`,
          download: `/docs/${j.id}/download`,
          tree: `/api/jobs/${j.id}/tree`,
        },
      })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve jobs'
    return c.json({ ok: false, error: message }, 500)
  }
}
