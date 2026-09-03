import { Footer } from '../../components/footer'
import { Nav } from '../../components/nav'
import { initDb, listCompletedJobs } from '../../modules/jobs'
import type { AppContext } from '../../shared/types'

export const GET = async (c: AppContext) => {
  await initDb()
  const jobs = await listCompletedJobs(50)

  return (
    <>
      <Nav active="docs" />
      <div class="wrap">
        <header style="padding: 32px 0 24px;">
          <span
            class="mono"
            style="font-size: 13px; color: var(--accent-ink); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;"
          >
            Community Library
          </span>
          <h1 style="margin: 8px 0 16px;">Mirrored Documentation</h1>
          <p class="lede" style="margin-bottom: 32px;">
            Full documentation sites converted to agent-first markdown.{' '}
            <span class="dim">
              Browse hierarchies, inspect audit trails, or download indexed ZIP bundles.
            </span>
          </p>
        </header>

        {jobs.length === 0 ? (
          <div
            class="panel"
            style="display: block; padding: 48px 24px; text-align: center; margin-bottom: 48px;"
          >
            <p class="lede" style="margin: 0 0 16px;">
              No documentation mirrors created yet.
            </p>
            <a href="/" class="secondary">
              Create the First Docs Cache →
            </a>
          </div>
        ) : (
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-bottom: 48px;">
            {jobs.map((j) => (
              <article
                key={j.id}
                style="
                  position: relative;
                  background: var(--card);
                  border: 1px solid var(--border);
                  border-radius: var(--radius);
                  padding: 22px;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  transition: border-color 0.15s ease, transform 0.15s ease;
                  cursor: pointer;
                "
              >
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
                    <span
                      class="mono"
                      style="font-size: 11.5px; color: var(--accent-ink); font-weight: 500;"
                    >
                      {j.resolved_url
                        ? new URL(j.resolved_url).hostname.replace(/^www\./, '')
                        : j.id}
                    </span>
                    <span
                      class="mono"
                      style="font-size: 11.5px; color: var(--ink-soft); background: var(--secondary); padding: 2px 8px; border-radius: 999px;"
                    >
                      {j.page_count} {j.page_count === 1 ? 'page' : 'pages'}
                    </span>
                  </div>

                  <h3 style="font-family: var(--sans); font-size: 18px; font-weight: 600; margin: 0 0 8px;">
                    <a href={`/docs/${j.id}`} style="color: var(--ink); text-decoration: none;">
                      <span
                        style="position: absolute; inset: 0; z-index: 1;"
                        aria-hidden="true"
                      ></span>
                      {j.product_name || 'Documentation'}
                    </a>
                  </h3>

                  <p style="font-size: 14px; color: var(--ink-body); line-height: 1.5; margin: 0 0 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    {j.description || j.title || j.input_url}
                  </p>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-soft); padding-top: 14px; margin-top: 8px;">
                  <span class="mono" style="font-size: 12px; color: var(--ink-soft);">
                    {(j.zip_size_bytes / 1024).toFixed(0)} KB ZIP
                  </span>
                  <span
                    class="mono"
                    style="
                      font-size: 11.5px;
                      color: var(--accent-ink);
                      border: 1px solid var(--border);
                      background: var(--card);
                      border-radius: 999px;
                      padding: 3px 10px;
                      display: inline-flex;
                      align-items: center;
                      position: relative;
                      z-index: 2;
                    "
                  >
                    {j.strategy || 'html-purify'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}
