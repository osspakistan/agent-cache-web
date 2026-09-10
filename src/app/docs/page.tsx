import { Nav } from '../../components/nav'
import { initDb, listCompletedJobs } from '../../features/jobs'
import { setPageMeta } from '../../lib/page-meta'
import { formatBytes } from '../../lib/utils'
import { nakedDomain } from '../../lib/utils/id'
import type { AppContext, JobRecord } from '../../lib/utils/types'

export const GET = async (c: AppContext) => {
  setPageMeta({
    title: 'Agent Cache // packaged docs',
    description: 'Download full doc sites pre-converted for coding agents.',
  })
  await initDb()
  const allJobs = await listCompletedJobs(100)
  const sp = new URL(c.req.url).searchParams
  const page = Math.max(1, Number(sp.get('page')) || 1)
  const perPage = 12

  const groups = new Map<string, JobRecord[]>()
  for (const j of allJobs) {
    const key = nakedDomain(j.input_url) || j.id
    const arr = groups.get(key)
    if (arr) arr.push(j)
    else groups.set(key, [j])
  }
  const grouped = [...groups.values()]
    .map((arr) => {
      arr.sort((a, b) => b.created_at - a.created_at)
      return {
        latest: arr[0],
        count: arr.length,
        naked: nakedDomain(arr[0].input_url),
      }
    })
    .sort((a, b) => b.latest.created_at - a.latest.created_at)

  const totalPages = Math.max(1, Math.ceil(grouped.length / perPage))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * perPage
  const paged = grouped.slice(start, start + perPage)

  setPageMeta({
    title: `Agent Cache // packaged docs${safePage > 1 ? ` (page ${safePage})` : ''}`,
    description:
      'Download full doc sites pre-converted for coding agents. Drop them in your repo and stop watching your agent hallucinate outdated APIs.',
    image: '/og?title=Packaged+docs&subtitle=Full+doc+sites+for+coding+agents',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Packaged docs',
      description: 'Full doc sites pre-converted for coding agents.',
      url: `https://agentcache.run/docs${safePage > 1 ? `?page=${safePage}` : ''}`,
    },
  })

  const pagination =
    totalPages > 1 ? (
      <div style="display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 48px;">
        {safePage > 1 ? (
          <a href={`/docs?page=${safePage - 1}`} class="secondary" style="margin: 0;">
            ← prev
          </a>
        ) : (
          <span class="secondary" style="margin: 0; opacity: 0.4; cursor: default;">
            ← prev
          </span>
        )}
        <span class="mono" style="font-size: 12px; color: var(--ink-soft);">
          {safePage} / {totalPages}
        </span>
        {safePage < totalPages ? (
          <a href={`/docs?page=${safePage + 1}`} class="secondary" style="margin: 0;">
            next →
          </a>
        ) : (
          <span class="secondary" style="margin: 0; opacity: 0.4; cursor: default;">
            next →
          </span>
        )}
      </div>
    ) : null

  return (
    <>
      <Nav active="docs" />
      <div class="wrap">
        <header style="">
          <span
            class="mono"
            style="font-size: 13px; color: var(--accent-ink); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;"
          >
            Packaged Docs
          </span>
          <h1 style="margin: 8px 0 16px;">Ready-to-use doc bundles.</h1>
          <p class="lede" style="margin-bottom: 32px;">
            Download full doc sites pre-converted for coding agents.{' '}
            <span class="dim">
              Drop them in your repo and stop watching your agent hallucinate outdated APIs.
            </span>
          </p>
        </header>

        {paged.length === 0 ? (
          <div
            class="panel"
            style="display: block; padding: 48px 24px; text-align: center; margin-bottom: 48px;"
          >
            <p class="lede" style="margin: 0 0 16px;">
              No bundles yet.
            </p>
            <a href="/" class="secondary">
              Bundle your first docs site →
            </a>
          </div>
        ) : (
          <>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 48px;">
              {paged.map(({ latest: j, count }) => {
                return (
                  <div key={j.id} style="position: relative; break-inside: avoid; min-width: 0;">
                    {count > 1 && (
                      <div
                        style="position: absolute; inset: 0; transform: translate(8px, 8px); background: var(--border-soft); border: 1px solid var(--border); border-radius: var(--radius);"
                        aria-hidden="true"
                      />
                    )}
                    {count > 1 && (
                      <div
                        style="position: absolute; inset: 0; transform: translate(4px, 4px); background: var(--secondary); border: 1px solid var(--border); border-radius: var(--radius);"
                        aria-hidden="true"
                      />
                    )}
                    <article style="position: relative; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px; display: flex; flex-direction: column; justify-content: space-between; transition: border-color 0.15s ease, transform 0.15s ease; cursor: pointer;">
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                          <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                            {j.logo_url && (
                              <img
                                src={j.logo_url}
                                alt=""
                                style="width: 16px; height: 16px; border-radius: 3px; object-fit: contain; flex-shrink: 0;"
                                onerror="this.style.display='none'"
                              />
                            )}
                            <span
                              class="mono"
                              style="font-size: 11.5px; color: var(--accent-ink); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                            >
                              {j.product_name ||
                                (j.resolved_url
                                  ? new URL(j.resolved_url).hostname.replace(/^www\./, '')
                                  : j.id)}
                            </span>
                          </div>
                          <span
                            class="mono card-pages-badge"
                            style="font-size: 11.5px; color: var(--ink-soft); background: var(--secondary); padding: 2px 8px; border-radius: 999px; flex-shrink: 0; cursor: help; position: relative;"
                            title={
                              count > 1
                                ? `${count} variants · ${formatBytes(j.zip_size_bytes).full} ZIP · ${j.strategy || 'html-purify'}`
                                : `${formatBytes(j.zip_size_bytes).full} ZIP · ${j.strategy || 'html-purify'}`
                            }
                          >
                            {j.page_count} {j.page_count === 1 ? 'page' : 'pages'}
                            {count > 1 && (
                              <span class="card-tooltip">
                                {count} variants · {formatBytes(j.zip_size_bytes).full} ZIP ·{' '}
                                {j.strategy || 'html-purify'}
                              </span>
                            )}
                          </span>
                        </div>
                        <h3 style="font-family: var(--sans); font-size: 17px; font-weight: 600; margin: 0 0 8px; line-height: 1.35;">
                          <a
                            href={`/docs/${j.id}`}
                            style="color: var(--ink); text-decoration: none;"
                          >
                            <span
                              style="position: absolute; inset: 0; z-index: 1;"
                              aria-hidden="true"
                            ></span>
                            {j.title || (j.product_name ? `${j.product_name} Documentation` : j.id)}
                          </a>
                        </h3>
                        <div style="min-height: 24px; margin-bottom: 16px;"></div>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-soft); padding-top: 14px; margin-top: 8px;">
                        <span class="mono" style="font-size: 12px; color: var(--ink-soft);">
                          {formatBytes(j.zip_size_bytes).full} ZIP
                        </span>
                        <span
                          class="mono"
                          style="font-size: 11.5px; color: var(--accent-ink); border: 1px solid var(--border); background: var(--card); border-radius: 999px; padding: 3px 10px; display: inline-flex; align-items: center; position: relative; z-index: 2;"
                        >
                          {j.strategy || 'html-purify'}
                        </span>
                      </div>
                    </article>
                  </div>
                )
              })}
            </div>
            {pagination}
          </>
        )}
      </div>
    </>
  )
}
