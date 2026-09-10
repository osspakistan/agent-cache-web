import { getJobById } from '../../../../features/jobs'
import { getPublicR2Url } from '../../../../lib/clients'
import type { AppContext } from '../../../../lib/utils/types'

/**
 * GET /api/jobs/:id - Retrieve status and metadata for a specific job
 */
export const GET = async (c: AppContext) => {
  const id = c.req.param('id')
  if (!id) {
    return c.json({ ok: false, error: 'Missing job ID', code: 'MISSING_JOB_ID' }, 400)
  }

  try {
    const job = await getJobById(id)
    if (!job) {
      return c.json({ ok: false, error: `Job not found: ${id}`, code: 'JOB_NOT_FOUND' }, 404)
    }

    const publicZipUrl =
      getPublicR2Url(`jobs/${id}/${id}.zip`) || getPublicR2Url(`jobs/${id}/bundle.zip`)

    return c.json({
      ok: true,
      job: {
        id: job.id,
        status: job.status,
        input_url: job.input_url,
        resolved_url: job.resolved_url,
        product_name: job.product_name,
        title: job.title,
        description: job.description,
        logo_url: job.logo_url,
        strategy: job.strategy,
        page_count: job.page_count,
        zip_size_bytes: job.zip_size_bytes,
        error_machine: job.error_machine,
        error_human: job.error_human,
        created_at: job.created_at,
        completed_at: job.completed_at,
      },
      links: {
        tree: `/api/jobs/${id}/tree`,
        logs: `/dingdong/${id}/raw-log`,
        stream: `/dingdong/${id}/stream`,
        viewer: `/docs/${id}`,
        download: publicZipUrl || `/docs/${id}/download`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error retrieving job'
    return c.json({ ok: false, error: message, code: 'SERVER_ERROR' }, 500)
  }
}
