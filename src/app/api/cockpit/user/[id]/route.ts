import { getUserDossier } from '../../../../../lib/clients'
import type { AppContext } from '../../../../../lib/utils/types'

/**
 * GET /api/cockpit/user/:id - Fetch user dossier and journey events
 */
export const GET = async (c: AppContext) => {
  const id = c.req.param('id')
  if (!id) {
    return c.json({ ok: false, error: 'User ID is required' }, 400)
  }

  const dossier = await getUserDossier(id)
  if (!dossier) {
    return c.json({ ok: false, error: 'User not found' }, 404)
  }

  return c.json({ ok: true, dossier })
}
