import type { AppContext } from '../../../../lib/utils/types'

/**
 * POST /api/cockpit/optout - Toggle device tracking opt-out
 * Sets or clears the `ac_optout=1` cookie.
 */
export const POST = async (c: AppContext) => {
  const cookieHeader = c.req.header('cookie') || ''
  const isCurrentlyOptedOut =
    cookieHeader.includes('ac_optout=1') || cookieHeader.includes('ac_optout=true')

  if (isCurrentlyOptedOut) {
    // Re-enable tracking (remove opt-out cookie)
    c.header('Set-Cookie', 'ac_optout=; Path=/; Max-Age=0; SameSite=Lax')
    if (c.req.header('HX-Request')) {
      c.header('HX-Refresh', 'true')
      return c.text('re-enabled', 200)
    }
    return c.json({ ok: true, opted_out: false })
  }

  // Disable tracking on this device (set opt-out cookie for 5 years)
  c.header('Set-Cookie', 'ac_optout=1; Path=/; Max-Age=157680000; SameSite=Lax')
  if (c.req.header('HX-Request')) {
    c.header('HX-Refresh', 'true')
    return c.text('opted_out', 200)
  }
  return c.json({ ok: true, opted_out: true })
}
