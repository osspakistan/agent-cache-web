import { getLoginCookieHeader, verifyPassword } from '../../../../lib/utils/cockpit-auth'
import type { AppContext } from '../../../../lib/utils/types'

/**
 * POST /api/cockpit/login - Authenticate admin with password
 */
export const POST = async (c: AppContext) => {
  let password = ''

  const cType = c.req.header('content-type') || ''
  if (cType.includes('application/json')) {
    try {
      const body = (await c.req.json()) as { password?: string }
      password = String(body.password || '')
    } catch {}
  } else {
    try {
      const form = await c.req.parseBody()
      password = String(form.password || '')
    } catch {}
  }

  if (!verifyPassword(password)) {
    if (c.req.header('HX-Request')) {
      return c.html(
        <div
          id="login-error"
          class="mono"
          style="color: #dc2626; font-size: 12px; margin-top: 8px;"
        >
          Incorrect password.
        </div>,
        401,
      )
    }
    return c.redirect('/cockpit?error=invalid_password', 303)
  }

  c.header('Set-Cookie', getLoginCookieHeader())

  if (c.req.header('HX-Request')) {
    c.header('HX-Redirect', '/cockpit')
    return c.text('ok', 200)
  }

  return c.redirect('/cockpit', 303)
}
