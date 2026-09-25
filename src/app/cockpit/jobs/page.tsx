import { initDb, listAllJobs, listFeedback } from '../../../lib/clients'
import { setPageMeta } from '../../../lib/page-meta'
import { formatBytes } from '../../../lib/utils'
import { isAuthenticated } from '../../../lib/utils/cockpit-auth'
import type { AppContext, FeedbackRecord, JobRecord } from '../../../lib/utils/types'

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

function formatDate(ts: number): string {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toISOString().replace('T', ' ').substring(0, 16)
}

export const GET = async (c: AppContext) => {
  setPageMeta({
    title: 'Jobs // Cockpit // Agent Cache',
    description: 'Crawl jobs and user feedback.',
  })

  if (!isAuthenticated(c)) {
    return Response.redirect('/cockpit', 302)
  }

  await initDb()

  const [jobs, feedback] = await Promise.all([listAllJobs(100), listFeedback(100)])

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    complete: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
    failed: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
    pending: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
    crawling: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
    probing: { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
    packaging: { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
  }
  const defaultBadge = { bg: 'var(--secondary)', text: 'var(--ink)', border: 'var(--border)' }

  return (
    <>
      {/* Sub-page Header */}
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
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <a
              href="/cockpit"
              class="mono"
              style="font-size: 11px; color: var(--ink-soft); text-decoration: none;"
            >
              ← Cockpit
            </a>
            <span class="mono" style="font-size: 11px; color: var(--ink-soft);">/</span>
            <span
              class="mono"
              style="font-size: 11px; color: var(--accent-ink); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;"
            >
              Jobs
            </span>
          </div>
          <h1 style="font-size: 22px; margin: 0;">Crawl Jobs &amp; Feedback</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span
            class="mono"
            style="
                font-size: 11.5px;
                padding: 4px 10px;
                background: var(--secondary);
                border: 1px solid var(--border);
                border-radius: 999px;
              "
          >
            {jobs.length} jobs loaded
          </span>
          <span
            class="mono"
            style="
                font-size: 11.5px;
                padding: 4px 10px;
                background: var(--secondary);
                border: 1px solid var(--border);
                border-radius: 999px;
              "
          >
            {feedback.length} feedback
          </span>
        </div>
      </div>

      {/* Recent Crawl Jobs */}
      <section style="margin-bottom: 48px;">
        <div
          style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 14px;
            "
        >
          <div>
            <h2 style="font-size: 18px; margin: 0 0 4px;">Recent Crawl Jobs</h2>
            <p style="font-size: 12.5px; color: var(--ink-soft); margin: 0;">
              Latest 100 crawl jobs recorded in the database
            </p>
          </div>
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
                const badge = statusColors[j.status] ?? defaultBadge
                return (
                  <tr style="border-bottom: 1px solid var(--border); vertical-align: middle;">
                    <td style="padding: 12px 16px;">
                      <div class="mono" style="font-weight: 600; color: var(--ink);">
                        {j.id}
                      </div>
                      <div class="mono" style="font-size: 11px; color: var(--ink-soft);" title={formatDate(j.created_at)}>
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

      {/* User Feedback */}
      <section style="margin-bottom: 48px;">
        <div
          style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 14px;
            "
        >
          <div>
            <h2 style="font-size: 18px; margin: 0 0 4px;">User Feedback &amp; Bug Reports</h2>
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
    </>
  )
}
