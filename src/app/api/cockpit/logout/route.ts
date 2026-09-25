import { getLogoutCookieHeader } from '../../../../lib/utils/cockpit-auth'
import type { AppContext } from '../../../../lib/utils/types'

/**
 * POST /api/cockpit/logout - Logout admin
 */
export const POST = async (c: AppContext) => {
  c.header('Set-Cookie', getLogoutCookieHeader())
  if (c.req.header('HX-Request')) {
    c.header('HX-Redirect', '/cockpit')
    return c.text('ok', 200)
  }
  return c.redirect('/cockpit', 303)
}
