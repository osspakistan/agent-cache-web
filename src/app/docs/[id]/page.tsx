import { DocumentationTreeSection } from '../../../components/doc-tree'
import { Footer } from '../../../components/footer'
import { Nav } from '../../../components/nav'
import { getJobById } from '../../../features/jobs'
import { getFromR2, getPublicR2Url } from '../../../lib/clients'
import { formatBytes } from '../../../lib/utils'
import type { AppContext, NavHierarchy } from '../../../lib/utils/types'

export const GET = async (c: AppContext) => {
  const id = c.req.param('id') || ''
  const job = await getJobById(id)

  if (!job) {
    return (
      <>
        <Nav active="docs" />
        <div class="wrap" style="padding: 96px 20px; text-align: center;">
          <h1>Documentation Cache Not Found</h1>
          <p class="lede">
            I couldn't find a record for{' '}
            <span class="mono" style="color: var(--accent-ink);">
              {id}
            </span>
            .
          </p>
          <a href="/" class="secondary" style="margin-top: 24px;">
            Back to the docs pile →
          </a>
        </div>
        <Footer />
      </>
    )
  }

  // Foreground-only enforcement: If job is still actively running, redirect to dingdong!
  if (
    job.status === 'pending' ||
    job.status === 'probing' ||
    job.status === 'crawling' ||
    job.status === 'packaging'
  ) {
    return c.redirect(`/dingdong/${id}`, 307)
  }

  // If job failed, render recovery state
  if (job.status === 'failed') {
    return (
      <>
        <Nav active="docs" />
        <div class="wrap" style="padding: 64px 20px;">
          <div
            style="
              background: var(--card);
              border: 1px solid #fecaca;
              border-radius: var(--radius);
              padding: 32px;
            "
          >
            <span
              class="mono"
              style="font-size: 12px; color: #b91c1c; text-transform: uppercase; font-weight: 600;"
            >
              Export stopped · {id}
            </span>
            <h2 style="font-size: 24px; margin: 8px 0 12px; color: #991b1b;">
              {job.product_name
                ? `Couldn't export ${job.product_name}`
                : 'Documentation export failed'}
            </h2>
            <p style="color: #7f1d1d; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              {job.error_human || 'Could not complete the documentation extraction.'}
            </p>

            {job.error_machine && (
              <details style="margin-bottom: 24px;">
                <summary
                  class="mono"
                  style="font-size: 11.5px; color: var(--ink-soft); cursor: pointer; margin-bottom: 8px;"
                >
                  Technical diagnostics log ▸
                </summary>
                <div style="background: var(--secondary); border: 1px solid var(--border); padding: 12px 16px; border-radius: 6px;">
                  <code
                    class="mono"
                    style="font-size: 12px; color: #991b1b; word-break: break-all; white-space: pre-wrap;"
                  >
                    {job.error_machine}
                  </code>
                </div>
              </details>
            )}

            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <a href={`/dingdong/${id}`} class="secondary" style="margin: 0;">
                Inspect Terminal Logs
              </a>
              <a
                href="/"
                class="secondary"
                style="margin: 0; background: var(--primary); color: var(--primary-foreground); border-color: var(--primary);"
              >
                Try Another Docs URL →
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // Load _map.json and meta.yaml directly from Cloudflare R2
  let mapData: NavHierarchy | null = null

  let mapBytes = await getFromR2(`jobs/${id}/final/_map.json`)
  if (!mapBytes) {
    mapBytes = await getFromR2(`jobs/${id}/.dingdong/03-nav-tree.json`)
  }

  if (mapBytes) {
    try {
      mapData = JSON.parse(Buffer.from(mapBytes).toString('utf8'))
    } catch {}
  }

  const directR2Download =
    getPublicR2Url(`jobs/${id}/${id}.zip`) ||
    getPublicR2Url(`jobs/${id}/bundle.zip`) ||
    `/docs/${id}/download`

  return (
    <>
      <Nav active="docs" />
      <div class="wrap">
        {/* Bento Grid Header Layout */}
        <div
          style="
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 16px;
            margin-bottom: 32px;
          "
        >
          {/* Bento Cell 1: Main Identity & Title (8 cols) */}
          <div
            style="
              grid-column: span 12;
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 24px 28px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            "
          >
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  {job.logo_url && (
                    <img
                      src={job.logo_url}
                      alt=""
                      style="width: 18px; height: 18px; border-radius: 4px; object-fit: contain;"
                      onerror="this.style.display='none'"
                    />
                  )}
                  <span
                    class="mono"
                    style="font-size: 12px; color: var(--accent-ink); font-weight: 600;"
                  >
                    {job.product_name || id}
                  </span>
                </div>

                <a
                  href={job.resolved_url || job.input_url}
                  target="_blank"
                  class="mono"
                  style="font-size: 11.5px; color: var(--ink-soft); text-decoration: underline;"
                  rel="noopener"
                >
                  {job.resolved_url
                    ? new URL(job.resolved_url).hostname.replace(/^www\./, '')
                    : job.input_url}
                </a>
              </div>

              <h1 style="font-size: clamp(22px, 3.5vw, 30px); margin: 0 0 10px; color: var(--ink); line-height: 1.3;">
                {job.title ||
                  (job.product_name ? `${job.product_name} Documentation` : 'Documentation')}
              </h1>

              <p style="color: var(--ink-body); font-size: 14.5px; line-height: 1.6; margin: 0; max-width: 72ch;">
                {job.description ||
                  (job.product_name
                    ? `Official documentation and API reference for ${job.product_name}.`
                    : 'Full site exported to clean markdown for coding agents.')}
              </p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 1px solid var(--border-soft); padding-top: 16px; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <a
                  href={directR2Download}
                  download={`${id}.zip`}
                  class="secondary"
                  style="
                    margin: 0;
                    background: var(--primary);
                    color: var(--primary-foreground);
                    border-color: var(--primary);
                    font-weight: 500;
                    padding: 6px 16px;
                    font-size: 13px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                  "
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Get ZIP bundle ({formatBytes(job.zip_size_bytes).full})
                </a>
              </div>

              <a
                href={`/dingdong/${id}`}
                class="mono"
                style="font-size: 12px; color: var(--ink-soft); text-decoration: underline;"
              >
                view audit logs →
              </a>
            </div>
          </div>

          {/* Bento Cell 2: Pages Mirrored (4 cols) */}
          <div
            style="
              grid-column: span 4;
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 18px 20px;
              display: flex;
              flex-direction: column;
              justify-content: center;
            "
          >
            <span
              class="mono"
              style="font-size: 11px; text-transform: uppercase; color: var(--ink-soft); letter-spacing: 0.05em;"
            >
              Extracted Pages
            </span>
            <b class="mono" style="font-size: 24px; color: var(--ink); margin-top: 4px;">
              {job.page_count}
            </b>
            <span style="font-size: 12px; color: var(--ink-soft); margin-top: 2px;">
              zero loss · all markdown
            </span>
          </div>

          {/* Bento Cell 3: Acquisition Strategy (4 cols) */}
          <div
            style="
              grid-column: span 4;
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 18px 20px;
              display: flex;
              flex-direction: column;
              justify-content: center;
            "
          >
            <span
              class="mono"
              style="font-size: 11px; text-transform: uppercase; color: var(--ink-soft); letter-spacing: 0.05em;"
            >
              Strategy
            </span>
            <b class="mono" style="font-size: 16px; color: var(--accent-ink); margin-top: 4px;">
              {job.strategy || 'auto'}
            </b>
            <span style="font-size: 12px; color: var(--ink-soft); margin-top: 2px;">
              cost-ordered acquisition
            </span>
          </div>

          {/* Bento Cell 4: Bundle Size & Format (4 cols) */}
          <div
            style="
              grid-column: span 4;
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 18px 20px;
              display: flex;
              flex-direction: column;
              justify-content: center;
            "
          >
            <span
              class="mono"
              style="font-size: 11px; text-transform: uppercase; color: var(--ink-soft); letter-spacing: 0.05em;"
            >
              Archive Size
            </span>
            <b class="mono" style="font-size: 24px; color: var(--ink); margin-top: 4px;">
              {formatBytes(job.zip_size_bytes).value}{' '}
              <span style="font-size: 14px; font-weight: normal;">
                {formatBytes(job.zip_size_bytes).unit}
              </span>
            </b>
            <span style="font-size: 12px; color: var(--ink-soft); margin-top: 2px;">
              offline ZIP bundle
            </span>
          </div>
        </div>

        {/* Interactive Multi-Nested Documentation Tree & ASCII Map */}
        {mapData ? (
          <DocumentationTreeSection productName={job.product_name || 'docs'} hierarchy={mapData} />
        ) : (
          <section style="padding: 0 0 48px;">
            <p style="color: var(--ink-soft);">No map manifest generated.</p>
          </section>
        )}
      </div>
      <Footer />
    </>
  )
}
