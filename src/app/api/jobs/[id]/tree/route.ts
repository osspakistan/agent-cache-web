import { getFromR2 } from '../../../../../lib/clients'
import type { AppContext, NavHierarchy } from '../../../../../lib/utils/types'

/**
 * GET /api/jobs/:id/tree — Retrieve the mapped navigation hierarchy for a job
 */
export const GET = async (c: AppContext) => {
  const id = c.req.param('id')
  if (!id) {
    return c.json({ ok: false, error: 'Missing job ID' }, 400)
  }

  try {
    // Try final map first, fallback to dingdong nav-tree
    let bytes = await getFromR2(`jobs/${id}/final/_map.json`)
    if (!bytes) {
      bytes = await getFromR2(`jobs/${id}/.dingdong/03-nav-tree.json`)
    }

    if (!bytes) {
      return c.json(
        {
          ok: false,
          error: `Navigation tree not yet available for job ${id}`,
        },
        404,
      )
    }

    const tree = JSON.parse(Buffer.from(bytes).toString('utf8')) as NavHierarchy

    return c.json({
      ok: true,
      job_id: id,
      tree,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error retrieving navigation tree'
    return c.json({ ok: false, error: message }, 500)
  }
}
