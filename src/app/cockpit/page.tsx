import { getAdminStats, getAnalyticsSummary, initDb } from '../../lib/clients'
import { setPageMeta } from '../../lib/page-meta'
import { formatBytes } from '../../lib/utils'
import { isAuthenticated } from '../../lib/utils/cockpit-auth'
import type { AppContext } from '../../lib/utils/types'

export const GET = async (c: AppContext) => {
  setPageMeta({
    title: 'Cockpit // Agent Cache',
    description: 'Internal admin dashboard — jobs, analytics, and feedback.',
  })

  const authed = isAuthenticated(c)

  if (!authed) {
    const errorParam = new URL(c.req.url).searchParams.get('error')
    return (
      <div class="wrap" style="padding: 60px 20px; max-width: 440px; margin: 0 auto;">
        <div
          style="
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 32px 28px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
            "
        >
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span
              class="mono"
              style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-ink); font-weight: 600;"
            >
              Restricted
            </span>
          </div>
          <h1 style="font-size: 22px; margin: 0 0 8px;">Cockpit Access</h1>
          <p style="font-size: 13px; color: var(--ink-soft); margin: 0 0 24px;">
            Enter your admin password to view system metrics and user reports.
          </p>

          <form
            method="post"
            action="/api/cockpit/login"
            hx-post="/api/cockpit/login"
            hx-swap="none"
            style="display: grid; gap: 16px;"
          >
            <label style="display: grid; gap: 6px;">
              <span class="mono" style="font-size: 12px; color: var(--ink-soft);">
                Password
              </span>
              <input
                type="password"
                name="password"
                required
                autofocus
                placeholder="••••••••••••"
                style="
                    font-size: 14px;
                    padding: 9px 12px;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    background: var(--secondary);
                    color: var(--ink);
                    outline: none;
                  "
              />
            </label>

            {errorParam === 'invalid_password' && (
              <div id="login-error" class="mono" style="color: #dc2626; font-size: 12px;">
                Incorrect password.
              </div>
            )}

            <button
              type="submit"
              class="mono"
              style="
                  font-size: 13px;
                  font-weight: 600;
                  color: var(--primary-foreground);
                  background: var(--primary);
                  border: 1px solid var(--primary);
                  border-radius: 6px;
                  padding: 10px 16px;
                  cursor: pointer;
                  margin-top: 4px;
                "
            >
              Sign in →
            </button>
          </form>
        </div>
      </div>
    )
  }

  await initDb()
  const cookieHeader = c.req.header('cookie') || ''
  const isOptedOut = cookieHeader.includes('ac_optout=1') || cookieHeader.includes('ac_optout=true')

  const [stats, analytics] = await Promise.all([
    getAdminStats(),
    getAnalyticsSummary(24 * 60 * 60 * 1000), // always show today's live count on home
  ])

  const successRate =
    stats.total_jobs > 0 ? Math.round((stats.complete_jobs / stats.total_jobs) * 100) : 100

  return (
    <>
      {/* Header Bar */}
      <div
        style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 32px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border-soft);
          "
      >
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span
              class="mono"
              style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-ink); font-weight: 600;"
            >
              Cockpit
            </span>
            <span class="mono" style="font-size: 11px; color: var(--ink-soft);">
              •
            </span>
            <span class="mono" style="font-size: 11px; color: #16a34a;">
              ● Live Database
            </span>
          </div>
          <h1 style="font-size: 24px; margin: 4px 0 0;">Dashboard Overview</h1>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          {/* Founder Device Tracking Opt-out Toggle */}
          <button
            type="button"
            hx-post="/api/cockpit/optout"
            hx-swap="none"
            class="mono"
            title={
              isOptedOut
                ? 'Tracking is currently PAUSED on this device. Click to re-enable.'
                : 'Tracking is currently ACTIVE on this device. Click to stop tracking this device.'
            }
            style={`
                font-size: 11.5px;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.15s ease;
                background: ${isOptedOut ? 'rgba(239, 68, 68, 0.08)' : 'rgba(22, 163, 74, 0.08)'};
                border: 1px solid ${isOptedOut ? 'rgba(239, 68, 68, 0.3)' : 'rgba(22, 163, 74, 0.3)'};
                color: ${isOptedOut ? '#dc2626' : '#16a34a'};
                font-weight: 600;
              `}
          >
            <span>{isOptedOut ? '🚫' : '🛡️'}</span>
            <span>{isOptedOut ? 'Device Tracking: Opted Out' : 'Device Tracking: Active'}</span>
          </button>

          <a
            href="/docs"
            class="mono"
            style="font-size: 12px; color: var(--ink-soft); text-decoration: none; padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px;"
          >
            Public Library ↗
          </a>
          <button
            type="button"
            hx-post="/api/cockpit/logout"
            hx-swap="none"
            class="mono"
            style="
                font-size: 12px;
                color: #dc2626;
                background: none;
                border: 1px solid var(--border);
                border-radius: 6px;
                padding: 6px 12px;
                cursor: pointer;
              "
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mixed Bento Stats — jobs + live analytics */}
      <div
        style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 40px;
          "
      >
        {/* Total Jobs */}
        <div
          style="
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 20px;
            "
        >
          <div class="mono" style="font-size: 11.5px; color: var(--ink-soft); margin-bottom: 6px;">
            TOTAL JOBS
          </div>
          <div style="font-size: 28px; font-weight: 700; color: var(--ink);">
            {stats.total_jobs}
          </div>
          <div class="mono" style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">
            {stats.complete_jobs} complete · {stats.failed_jobs} failed
          </div>
        </div>

        {/* Success Rate */}
        <div
          style="
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 20px;
            "
        >
          <div class="mono" style="font-size: 11.5px; color: var(--ink-soft); margin-bottom: 6px;">
            SUCCESS RATE
          </div>
          <div style="font-size: 28px; font-weight: 700; color: #16a34a;">{successRate}%</div>
          <div class="mono" style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">
            {stats.pending_jobs} currently in flight
          </div>
        </div>

        {/* Pages Parsed */}
        <div
          style="
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 20px;
            "
        >
          <div class="mono" style="font-size: 11.5px; color: var(--ink-soft); margin-bottom: 6px;">
            PAGES PARSED
          </div>
          <div style="font-size: 28px; font-weight: 700; color: var(--ink);">
            {stats.total_pages.toLocaleString()}
          </div>
          <div class="mono" style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">
            {formatBytes(stats.total_bytes).full} cached ZIPs
          </div>
        </div>

        {/* Live Visitors */}
        <div
          style="
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 20px;
            "
        >
          <div
            class="mono"
            style="font-size: 11.5px; color: var(--ink-soft); margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;"
          >
            <span>LIVE VISITORS</span>
            <span style="color: #16a34a; font-weight: 600;">● Active</span>
          </div>
          <div style="font-size: 28px; font-weight: 700; color: #16a34a;">
            {analytics.live_count}
          </div>
          <div class="mono" style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">
            Active in last 5 minutes
          </div>
        </div>

        {/* Total Visitors Today */}
        <div
          style="
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 20px;
            "
        >
          <div class="mono" style="font-size: 11.5px; color: var(--ink-soft); margin-bottom: 6px;">
            VISITORS TODAY
          </div>
          <div style="font-size: 28px; font-weight: 700; color: var(--ink);">
            {analytics.total_visitors ?? 0}
          </div>
          <div class="mono" style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">
            {analytics.new_visitors ?? 0} new · {analytics.returning_visitors ?? 0} returning
          </div>
        </div>

        {/* Total Pageviews Today */}
        <div
          style="
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 20px;
            "
        >
          <div class="mono" style="font-size: 11.5px; color: var(--ink-soft); margin-bottom: 6px;">
            PAGEVIEWS TODAY
          </div>
          <div style="font-size: 28px; font-weight: 700; color: var(--accent-ink);">
            {analytics.human_views ?? 0}
          </div>
          <div class="mono" style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">
            {analytics.agent_views ?? 0} agent · {analytics.bot_views ?? 0} bot
          </div>
        </div>

        {/* Feedback */}
        <div
          style="
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 20px;
            "
        >
          <div class="mono" style="font-size: 11.5px; color: var(--ink-soft); margin-bottom: 6px;">
            FEEDBACK RECEIVED
          </div>
          <div style="font-size: 28px; font-weight: 700; color: var(--accent-ink);">
            {stats.total_feedback}
          </div>
          <div class="mono" style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">
            User bug reports &amp; requests
          </div>
        </div>
      </div>

      {/* Sub-module navigation cards */}
      <div
        style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
          "
      >
        {/* Analytics Card */}
        <a
          href="/cockpit/analytics"
          style="
              display: block;
              text-decoration: none;
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 24px 26px;
              transition: border-color 0.15s ease, box-shadow 0.15s ease;
            "
          onmouseover="this.style.borderColor='var(--accent-ink)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.06)'"
          onmouseout="this.style.borderColor='var(--border)'; this.style.boxShadow='none'"
        >
          <div style="font-size: 28px; margin-bottom: 12px;">📊</div>
          <div
            class="mono"
            style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent-ink); font-weight: 700; margin-bottom: 6px;"
          >
            Analytics
          </div>
          <div style="font-size: 17px; font-weight: 700; color: var(--ink); margin-bottom: 8px;">
            Traffic &amp; User Journeys
          </div>
          <p style="font-size: 13px; color: var(--ink-soft); margin: 0 0 16px; line-height: 1.5;">
            Live visitor rosters, session journeys, top pages, referrers, and geographic breakdown.
            Filter by time range.
          </p>
          <span
            class="mono"
            style="font-size: 12px; font-weight: 600; color: var(--accent-ink);"
          >
            Open Analytics →
          </span>
        </a>

        {/* Jobs Card */}
        <a
          href="/cockpit/jobs"
          style="
              display: block;
              text-decoration: none;
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 24px 26px;
              transition: border-color 0.15s ease, box-shadow 0.15s ease;
            "
          onmouseover="this.style.borderColor='var(--accent-ink)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.06)'"
          onmouseout="this.style.borderColor='var(--border)'; this.style.boxShadow='none'"
        >
          <div style="font-size: 28px; margin-bottom: 12px;">🕷️</div>
          <div
            class="mono"
            style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent-ink); font-weight: 700; margin-bottom: 6px;"
          >
            Crawl Jobs
          </div>
          <div style="font-size: 17px; font-weight: 700; color: var(--ink); margin-bottom: 8px;">
            Jobs &amp; Feedback
          </div>
          <p style="font-size: 13px; color: var(--ink-soft); margin: 0 0 16px; line-height: 1.5;">
            All crawl jobs with status, pages parsed, strategy, and download links. Plus user
            feedback and bug reports.
          </p>
          <span
            class="mono"
            style="font-size: 12px; font-weight: 600; color: var(--accent-ink);"
          >
            Open Jobs →
          </span>
        </a>
      </div>
    </>
  )
}
