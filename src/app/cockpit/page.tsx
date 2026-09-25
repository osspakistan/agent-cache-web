import { Nav } from '../../components/nav'
import {
  getAdminStats,
  getAnalyticsSummary,
  initDb,
  listAllJobs,
  listFeedback,
} from '../../lib/clients'
import { setPageMeta } from '../../lib/page-meta'
import { formatBytes } from '../../lib/utils'
import { countryFlag } from '../../lib/utils/analytics-detect'
import { isAuthenticated } from '../../lib/utils/cockpit-auth'
import type { AppContext, FeedbackRecord, JobRecord, LiveVisitor } from '../../lib/utils/types'

function formatDate(ts: number): string {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toISOString().replace('T', ' ').substring(0, 16)
}

function timeAgo(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export const GET = async (c: AppContext) => {
  setPageMeta({
    title: 'Cockpit // Agent Cache',
    description: 'Internal admin statistics, jobs monitoring, and user feedback.',
  })

  const authed = isAuthenticated(c)

  if (!authed) {
    const errorParam = new URL(c.req.url).searchParams.get('error')
    return (
      <>
        <Nav active="cockpit" />
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
      </>
    )
  }

  await initDb()
  const [stats, jobs, feedback, analytics] = await Promise.all([
    getAdminStats(),
    listAllJobs(50),
    listFeedback(100),
    getAnalyticsSummary(24 * 60 * 60 * 1000),
  ])

  return (
    <>
      <Nav active="cockpit" />
      <div class="wrap" style="padding-bottom: 60px;">
        {/* Header Bar */}
        <div
          style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 28px;
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
            <h1 style="font-size: 24px; margin: 4px 0 0;">System & Feedback Overview</h1>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
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

        {/* Bento Stats Grid */}
        <div
          style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 40px;
          "
        >
          {/* Card 1: Total Jobs */}
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
              style="font-size: 11.5px; color: var(--ink-soft); margin-bottom: 6px;"
            >
              TOTAL JOBS
            </div>
            <div style="font-size: 28px; font-weight: 700; color: var(--ink);">
              {stats.total_jobs}
            </div>
            <div class="mono" style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">
              {stats.complete_jobs} complete · {stats.failed_jobs} failed
            </div>
          </div>

          {/* Card 2: Success Rate */}
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
              style="font-size: 11.5px; color: var(--ink-soft); margin-bottom: 6px;"
            >
              SUCCESS RATE
            </div>
            <div style="font-size: 28px; font-weight: 700; color: #16a34a;">
              {stats.total_jobs > 0
                ? `${Math.round((stats.complete_jobs / stats.total_jobs) * 100)}%`
                : '100%'}
            </div>
            <div class="mono" style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">
              {stats.pending_jobs} currently in flight
            </div>
          </div>

          {/* Card 3: Total Pages */}
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
              style="font-size: 11.5px; color: var(--ink-soft); margin-bottom: 6px;"
            >
              PAGES PARSED
            </div>
            <div style="font-size: 28px; font-weight: 700; color: var(--ink);">
              {stats.total_pages.toLocaleString()}
            </div>
            <div class="mono" style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">
              {formatBytes(stats.total_bytes).full} cached ZIPs
            </div>
          </div>

          {/* Card: Live Traffic */}
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

          {/* Card 4: Feedback Submissions */}
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
              style="font-size: 11.5px; color: var(--ink-soft); margin-bottom: 6px;"
            >
              FEEDBACK RECEIVED
            </div>
            <div style="font-size: 28px; font-weight: 700; color: var(--accent-ink);">
              {stats.total_feedback}
            </div>
            <div class="mono" style="font-size: 11px; color: var(--ink-soft); margin-top: 4px;">
              User bug reports & requests
            </div>
          </div>
        </div>

        {/* Live Traffic Radar & Client Breakdown */}
        <section style="margin-bottom: 48px;">
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 16px;
            "
          >
            <div>
              <h2 style="font-size: 18px; margin: 0 0 4px;">Live Visitor Radar & Telemetry</h2>
              <p style="font-size: 12.5px; color: var(--ink-soft); margin: 0;">
                Real-time active sessions, user locations, device types, and what actions they take
              </p>
            </div>
            <div style="display: flex; gap: 8px;">
              <span
                class="mono"
                style="
                  font-size: 11px;
                  padding: 3px 8px;
                  background: var(--secondary);
                  border: 1px solid var(--border);
                  border-radius: 999px;
                  color: var(--ink-soft);
                "
              >
                👤 {analytics.human_views} humans
              </span>
              <span
                class="mono"
                style="
                  font-size: 11px;
                  padding: 3px 8px;
                  background: var(--secondary);
                  border: 1px solid var(--border);
                  border-radius: 999px;
                  color: var(--accent-ink);
                "
              >
                🤖 {analytics.agent_views} coding agents
              </span>
              <span
                class="mono"
                style="
                  font-size: 11px;
                  padding: 3px 8px;
                  background: var(--secondary);
                  border: 1px solid var(--border);
                  border-radius: 999px;
                  color: var(--ink-soft);
                "
              >
                🕷️ {analytics.bot_views} bots
              </span>
            </div>
          </div>

          {/* Live Active Sessions Table */}
          <div
            style="
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              overflow-x: auto;
              margin-bottom: 24px;
            "
          >
            {analytics.live_visitors.length === 0 ? (
              <div style="padding: 28px; text-align: center; color: var(--ink-soft);">
                <p class="mono" style="font-size: 12.5px; margin: 0;">
                  No live visitors active in the last 5 minutes.
                </p>
              </div>
            ) : (
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12.5px;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border); background: var(--secondary);">
                    <th
                      class="mono"
                      style="padding: 8px 14px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                    >
                      VISITOR / TYPE
                    </th>
                    <th
                      class="mono"
                      style="padding: 8px 14px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                    >
                      CURRENT PAGE
                    </th>
                    <th
                      class="mono"
                      style="padding: 8px 14px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                    >
                      LAST ACTION
                    </th>
                    <th
                      class="mono"
                      style="padding: 8px 14px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                    >
                      LOCATION
                    </th>
                    <th
                      class="mono"
                      style="padding: 8px 14px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                    >
                      DEVICE / BROWSER
                    </th>
                    <th
                      class="mono"
                      style="padding: 8px 14px; font-size: 11px; font-weight: 600; color: var(--ink-soft); text-align: right;"
                    >
                      LAST SEEN
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.live_visitors.map((v: LiveVisitor) => (
                    <tr style="border-bottom: 1px solid var(--border); vertical-align: middle;">
                      <td style="padding: 10px 14px; white-space: nowrap;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span style="font-size: 10px; color: #16a34a;">●</span>
                          <span
                            class="mono"
                            style="font-weight: 600; font-size: 11.5px; color: var(--ink);"
                          >
                            {v.session_id.substring(0, 10)}
                          </span>
                          <span
                            class="mono"
                            style="
                              font-size: 10px;
                              padding: 1px 6px;
                              border-radius: 4px;
                              background: var(--secondary);
                              border: 1px solid var(--border);
                            "
                          >
                            {v.client_type}
                          </span>
                        </div>
                      </td>
                      <td
                        class="mono"
                        style="padding: 10px 14px; font-size: 12px; color: var(--ink);"
                      >
                        {v.current_path}
                      </td>
                      <td style="padding: 10px 14px; font-size: 12px;">
                        <span
                          class="mono"
                          style="
                            font-size: 11px;
                            color: var(--accent-ink);
                            background: var(--secondary);
                            border: 1px solid var(--border-soft);
                            padding: 2px 6px;
                            border-radius: 4px;
                          "
                        >
                          {v.last_action}
                        </span>
                      </td>
                      <td style="padding: 10px 14px; white-space: nowrap;">
                        <span style="margin-right: 6px;">{countryFlag(v.country_code)}</span>
                        <span style="color: var(--ink);">
                          {v.city ? `${v.city}, ` : ''}
                          {v.country_name || v.country_code || 'Unknown'}
                        </span>
                      </td>
                      <td
                        class="mono"
                        style="padding: 10px 14px; font-size: 11px; color: var(--ink-soft); white-space: nowrap;"
                      >
                        {v.os || '-'} · {v.browser || '-'}
                      </td>
                      <td
                        class="mono"
                        style="padding: 10px 14px; font-size: 11.5px; text-align: right; color: var(--ink-soft); white-space: nowrap;"
                      >
                        {timeAgo(v.last_active_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Breakdown Bento: Top Pages, Top Clicks/Actions, Top Referrers */}
          <div
            style="
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 16px;
            "
          >
            {/* Top Paths */}
            <div
              style="
                background: var(--card);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 18px 20px;
              "
            >
              <h3
                class="mono"
                style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--ink-soft); margin: 0 0 12px;"
              >
                Top Visited Pages (24h)
              </h3>
              {analytics.top_paths.length === 0 ? (
                <div class="mono" style="font-size: 12px; color: var(--ink-soft);">
                  No pageviews recorded yet.
                </div>
              ) : (
                <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
                  {analytics.top_paths.map((p) => (
                    <li style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px;">
                      <span
                        class="mono"
                        style="color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;"
                      >
                        {p.path}
                      </span>
                      <span class="mono" style="color: var(--accent-ink); font-weight: 600;">
                        {p.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Top User Actions / Button Clicks */}
            <div
              style="
                background: var(--card);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 18px 20px;
              "
            >
              <h3
                class="mono"
                style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--ink-soft); margin: 0 0 12px;"
              >
                Buttons & Actions Triggered
              </h3>
              {analytics.top_actions.length === 0 ? (
                <div class="mono" style="font-size: 12px; color: var(--ink-soft);">
                  No clicks or actions recorded yet.
                </div>
              ) : (
                <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
                  {analytics.top_actions.map((a) => (
                    <li style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px;">
                      <span
                        class="mono"
                        style="color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;"
                      >
                        {a.action}
                      </span>
                      <span class="mono" style="color: #16a34a; font-weight: 600;">
                        {a.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Top Discovery Referrers & Countries */}
            <div
              style="
                background: var(--card);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 18px 20px;
              "
            >
              <h3
                class="mono"
                style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--ink-soft); margin: 0 0 12px;"
              >
                Referral Channels
              </h3>
              {analytics.top_referrers.length === 0 ? (
                <div class="mono" style="font-size: 12px; color: var(--ink-soft);">
                  Direct / No referrers yet.
                </div>
              ) : (
                <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
                  {analytics.top_referrers.map((r) => (
                    <li style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px;">
                      <span
                        class="mono"
                        style="color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;"
                      >
                        {r.referrer}
                      </span>
                      <span class="mono" style="color: var(--ink-soft); font-weight: 600;">
                        {r.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Section 1: Feedback Reports */}
        <section style="margin-bottom: 48px;">
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 16px;
            "
          >
            <div>
              <h2 style="font-size: 18px; margin: 0 0 4px;">User Feedback & Bug Reports</h2>
              <p style="font-size: 12.5px; color: var(--ink-soft); margin: 0;">
                Submissions from the docs detail modal ("something missing? →")
              </p>
            </div>
            <span
              class="mono"
              style="
                font-size: 11.5px;
                padding: 3px 8px;
                background: var(--secondary);
                border: 1px solid var(--border);
                border-radius: 999px;
              "
            >
              {feedback.length} records
            </span>
          </div>

          <div
            style="
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              overflow-x: auto;
            "
          >
            {feedback.length === 0 ? (
              <div style="padding: 36px; text-align: center; color: var(--ink-soft);">
                <p class="mono" style="font-size: 13px; margin: 0;">
                  No feedback reports submitted yet.
                </p>
              </div>
            ) : (
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border); background: var(--secondary);">
                    <th
                      class="mono"
                      style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                    >
                      DATE
                    </th>
                    <th
                      class="mono"
                      style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                    >
                      KIND
                    </th>
                    <th
                      class="mono"
                      style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                    >
                      USER EMAIL
                    </th>
                    <th
                      class="mono"
                      style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                    >
                      DOCS BUNDLE
                    </th>
                    <th
                      class="mono"
                      style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                    >
                      DETAILS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.map((f: FeedbackRecord) => (
                    <tr style="border-bottom: 1px solid var(--border); vertical-align: top;">
                      <td
                        class="mono"
                        style="padding: 12px 16px; font-size: 12px; white-space: nowrap; color: var(--ink-soft);"
                        title={formatDate(f.created_at)}
                      >
                        {timeAgo(f.created_at)}
                      </td>
                      <td style="padding: 12px 16px; white-space: nowrap;">
                        <span
                          class="mono"
                          style="
                            font-size: 11px;
                            padding: 2px 8px;
                            border-radius: 4px;
                            background: var(--secondary);
                            border: 1px solid var(--border);
                            color: var(--accent-ink);
                          "
                        >
                          {f.kind}
                        </span>
                      </td>
                      <td style="padding: 12px 16px; white-space: nowrap;">
                        <a
                          href={`mailto:${f.email}`}
                          class="mono"
                          style="color: var(--ink); text-decoration: underline;"
                        >
                          {f.email}
                        </a>
                      </td>
                      <td style="padding: 12px 16px; white-space: nowrap;">
                        {f.job_id ? (
                          <a
                            href={`/docs/${f.job_id}`}
                            class="mono"
                            style="font-size: 12px; color: var(--accent-ink); text-decoration: underline;"
                            target="_blank"
                            rel="noopener"
                          >
                            {f.job_id} ↗
                          </a>
                        ) : (
                          <span class="mono" style="color: var(--ink-soft); font-size: 12px;">
                            -
                          </span>
                        )}
                      </td>
                      <td style="padding: 12px 16px; color: var(--ink); max-width: 400px; word-break: break-word;">
                        {f.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Section 2: Recent Crawl Jobs */}
        <section>
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 16px;
            "
          >
            <div>
              <h2 style="font-size: 18px; margin: 0 0 4px;">Recent Crawl Jobs</h2>
              <p style="font-size: 12.5px; color: var(--ink-soft); margin: 0;">
                Latest 50 crawl jobs recorded in the database
              </p>
            </div>
            <span
              class="mono"
              style="
                font-size: 11.5px;
                padding: 3px 8px;
                background: var(--secondary);
                border: 1px solid var(--border);
                border-radius: 999px;
              "
            >
              {jobs.length} loaded
            </span>
          </div>

          <div
            style="
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              overflow-x: auto;
            "
          >
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); background: var(--secondary);">
                  <th
                    class="mono"
                    style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                  >
                    JOB ID / CREATED
                  </th>
                  <th
                    class="mono"
                    style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                  >
                    TARGET / PRODUCT
                  </th>
                  <th
                    class="mono"
                    style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                  >
                    STATUS
                  </th>
                  <th
                    class="mono"
                    style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                  >
                    PAGES
                  </th>
                  <th
                    class="mono"
                    style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                  >
                    SIZE
                  </th>
                  <th
                    class="mono"
                    style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft);"
                  >
                    STRATEGY
                  </th>
                  <th
                    class="mono"
                    style="padding: 10px 16px; font-size: 11px; font-weight: 600; color: var(--ink-soft); text-align: right;"
                  >
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j: JobRecord) => {
                  const statusColors: Record<string, { bg: string; text: string; border: string }> =
                    {
                      complete: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
                      failed: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
                      pending: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
                      crawling: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
                      probing: { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
                      packaging: { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
                    }
                  const badge = statusColors[j.status] || {
                    bg: 'var(--secondary)',
                    text: 'var(--ink)',
                    border: 'var(--border)',
                  }

                  return (
                    <tr style="border-bottom: 1px solid var(--border); vertical-align: middle;">
                      <td style="padding: 12px 16px;">
                        <div class="mono" style="font-weight: 600; color: var(--ink);">
                          {j.id}
                        </div>
                        <div class="mono" style="font-size: 11px; color: var(--ink-soft);">
                          {timeAgo(j.created_at)}
                        </div>
                      </td>
                      <td style="padding: 12px 16px; max-width: 260px;">
                        <div style="font-weight: 500; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                          {j.product_name || j.title || 'Unknown'}
                        </div>
                        <a
                          href={j.resolved_url || j.input_url}
                          target="_blank"
                          rel="noopener"
                          class="mono"
                          style="font-size: 11px; color: var(--ink-soft); text-decoration: underline; overflow: hidden; text-overflow: ellipsis; display: block; white-space: nowrap;"
                        >
                          {j.resolved_url || j.input_url}
                        </a>
                      </td>
                      <td style="padding: 12px 16px; white-space: nowrap;">
                        <span
                          class="mono"
                          style={`
                            font-size: 11px;
                            padding: 2px 8px;
                            border-radius: 4px;
                            background: ${badge.bg};
                            color: ${badge.text};
                            border: 1px solid ${badge.border};
                            font-weight: 600;
                          `}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td class="mono" style="padding: 12px 16px; white-space: nowrap;">
                        {j.page_count}
                      </td>
                      <td
                        class="mono"
                        style="padding: 12px 16px; white-space: nowrap; color: var(--ink-soft);"
                      >
                        {formatBytes(j.zip_size_bytes).full}
                      </td>
                      <td
                        class="mono"
                        style="padding: 12px 16px; white-space: nowrap; font-size: 11.5px; color: var(--ink-soft);"
                      >
                        {j.strategy || '-'}
                      </td>
                      <td style="padding: 12px 16px; text-align: right; white-space: nowrap;">
                        <div style="display: inline-flex; gap: 8px;">
                          {j.status === 'complete' && (
                            <a
                              href={`/docs/${j.id}`}
                              class="mono"
                              style="font-size: 11.5px; color: var(--accent-ink); text-decoration: underline;"
                            >
                              view
                            </a>
                          )}
                          <a
                            href={`/dingdong/${j.id}`}
                            class="mono"
                            style="font-size: 11.5px; color: var(--ink-soft); text-decoration: underline;"
                          >
                            logs
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}
