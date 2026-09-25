import { getLogoutCookieHeader } from '../../../../lib/utils/admin-auth'
import type { AppContext } from '../../../../lib/utils/types'

/**
 * POST /api/admin/logout - Logout admin
 */
export const POST = async (c: AppContext) => {
  c.header('Set-Cookie', getLogoutCookieHeader())
  if (c.req.header('HX-Request')) {
    c.header('HX-Redirect', '/admin')
    return c.text('ok', 200)
  }
  return c.redirect('/admin', 303)
}
