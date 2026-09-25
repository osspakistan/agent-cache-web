import { Nav } from '../../components/nav'
import { getAdminStats, initDb, listAllJobs, listFeedback } from '../../lib/clients'
import { setPageMeta } from '../../lib/page-meta'
import { formatBytes } from '../../lib/utils'
import { isAuthenticated } from '../../lib/utils/admin-auth'
import type { AppContext, FeedbackRecord, JobRecord } from '../../lib/utils/types'

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
    title: 'Admin Dashboard // Agent Cache',
    description: 'Internal admin statistics, jobs monitoring, and user feedback.',
  })

  const authed = isAuthenticated(c)

  if (!authed) {
    const errorParam = new URL(c.req.url).searchParams.get('error')
    return c.html(
      <>
        <Nav active="admin" />
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
            <h1 style="font-size: 22px; margin: 0 0 8px;">Admin Login</h1>
            <p style="font-size: 13px; color: var(--ink-soft); margin: 0 0 24px;">
              Enter your admin password to view system metrics and user reports.
            </p>

            <form
              method="post"
              action="/api/admin/login"
              hx-post="/api/admin/login"
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
      </>,
    )
  }

  await initDb()
  const [stats, jobs, feedback] = await Promise.all([
    getAdminStats(),
    listAllJobs(50),
    listFeedback(100),
  ])

  return c.html(
    <>
      <Nav active="admin" />
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
                Admin Area
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
              hx-post="/api/admin/logout"
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
    </>,
  )
}
