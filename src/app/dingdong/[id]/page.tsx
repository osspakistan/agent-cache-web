import { Footer } from '../../../components/footer'
import { Nav } from '../../../components/nav'
import { getJobById } from '../../../features/jobs'
import { readEventsFromR2 } from '../../../lib/clients'
import type { AppContext } from '../../../lib/utils/types'

export const GET = async (c: AppContext) => {
  const id = c.req.param('id') || ''
  const job = await getJobById(id)

  if (!job) {
    return (
      <>
        <Nav active="dingdong" />
        <div class="wrap" style="padding: 96px 20px; text-align: center;">
          <h1>Cache not found.</h1>
          <p class="lede">
            We couldn't find a job record for{' '}
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

  // Pre-load past events directly from R2 for instant replay
  const events = await readEventsFromR2(id)

  return (
    <>
      <Nav active="dingdong" />
      <div class="wrap">
        <header style="padding: 32px 0 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
            <div>
              <span
                class="mono"
                style="font-size: 13px; color: var(--accent-ink); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;"
              >
                {id} · live terminal
              </span>
              <h1 style="margin: 8px 0 12px;">
                {job.title ||
                  (job.product_name
                    ? `${job.product_name} Documentation`
                    : 'Packaging documentation')}
              </h1>
              {job.description && (
                <p style="color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin: 0 0 12px; max-width: 65ch;">
                  {job.description}
                </p>
              )}
              <p class="lede" style="margin: 0; font-size: 15.5px;">
                Target:{' '}
                <span class="mono" style="color: var(--ink);">
                  {job.input_url}
                </span>
              </p>
            </div>
            <div style="margin-top: 8px;">
              <a
                href={`/dingdong/${id}/raw-log`}
                target="_blank"
                class="secondary"
                style="margin: 0; padding: 6px 14px; font-size: 12.5px;"
                rel="noopener"
              >
                view raw log
              </a>
            </div>
          </div>
        </header>

        {/* Live Terminal Window */}
        <div
          id="terminal-window"
          class="panel"
          style="
            display: block;
            background: #181716;
            color: #dcd8d0;
            padding: 16px 20px;
            font-family: var(--mono);
            font-size: 13px;
            line-height: 1.7;
            min-height: 380px;
            max-height: 520px;
            overflow-y: auto;
            border: 1px solid var(--dark-rule);
            margin-bottom: 24px;
          "
        >
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px; border-bottom: 1px dashed #333130; padding-bottom: 12px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #ff5f56; display: inline-block;"></span>
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #ffbd2e; display: inline-block;"></span>
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #27c93f; display: inline-block;"></span>
            <span style="margin-left: 8px; font-size: 11.5px; color: #8d8a83;">
              agent-cache-engine — job [{id}] · {job.input_url}
            </span>
          </div>

          <div id="terminal-lines">
            {events.map((ev) => {
              let color = '#a6a29a'
              if (ev.type === 'phase') color = '#7b9ee0'
              if (ev.type === 'progress') color = '#7fb98a'
              if (ev.type === 'error') color = '#f87171'
              if (ev.type === 'complete') color = '#b9cbea'

              return (
                <div
                  key={`${ev.timestamp}-${ev.type}-${ev.done ?? ''}-${ev.current_url || ''}`}
                  style={`color: ${color}; margin-bottom: 4px;`}
                >
                  <span style="color: #63605c; margin-right: 10px;">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                  {ev.message ||
                    ev.machine ||
                    ev.human ||
                    (ev.type === 'progress'
                      ? `[${ev.done}/${ev.total}] ${ev.current_url}`
                      : JSON.stringify(ev))}
                </div>
              )
            })}
          </div>
        </div>

        {/* Action / Recovery Box */}
        <div id="action-box" style="margin-bottom: 48px;">
          {job.status === 'complete' ? (
            <div
              style="
                background: var(--card);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 16px;
              "
            >
              <div>
                <h3 style="margin: 0 0 4px; font-size: 18px; font-weight: 600; color: var(--ink);">
                  Documentation Ready
                </h3>
                <p style="margin: 0; font-size: 14.5px; color: var(--ink-body);">
                  {job.page_count} pages extracted and indexed into Cloudflare R2.
                </p>
              </div>
              <a
                href={`/docs/${id}`}
                class="secondary"
                style="background: var(--primary); color: var(--primary-foreground); border-color: var(--primary); font-weight: 500;"
              >
                Open Documentation →
              </a>
            </div>
          ) : job.status === 'failed' ? (
            <div
              style="
                background: var(--card);
                border: 1px solid #fecaca;
                border-radius: var(--radius);
                padding: 24px;
              "
            >
              <span
                class="mono"
                style="font-size: 11.5px; color: #b91c1c; text-transform: uppercase; font-weight: 600;"
              >
                Extraction Stopped
              </span>
              <h3 style="margin: 6px 0 8px; font-size: 18px; font-weight: 600; color: #991b1b;">
                {job.error_human || 'Could not complete documentation mirror.'}
              </h3>
              {job.error_machine && (
                <details style="margin-top: 10px;">
                  <summary
                    class="mono"
                    style="font-size: 11px; color: #991b1b; cursor: pointer; text-decoration: underline;"
                  >
                    technical details ▸
                  </summary>
                  <p
                    class="mono"
                    style="margin: 6px 0 0; font-size: 11.5px; color: #7f1d1d; word-break: break-all; background: #fee2e2; padding: 8px 12px; border-radius: 4px;"
                  >
                    {job.error_machine}
                  </p>
                </details>
              )}
            </div>
          ) : (
            <p
              class="mono"
              style="font-size: 13px; color: var(--ink-soft); text-align: center; margin: 24px 0;"
            >
              keep this tab open · live extraction streaming in foreground...
            </p>
          )}
        </div>
      </div>

      {/* Client-Side SSE Listener */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            const jobId = "${id}";
            const term = document.getElementById("terminal-lines");
            const termWin = document.getElementById("terminal-window");
            const actionBox = document.getElementById("action-box");

            // Cap the terminal buffer to max 120 lines in DOM to guarantee constant memory
            const MAX_LINES = 120;
            let scrollPending = false;

            function requestTerminalScroll() {
              if (scrollPending) return;
              scrollPending = true;
              requestAnimationFrame(() => {
                if (termWin) termWin.scrollTop = termWin.scrollHeight;
                scrollPending = false;
              });
            }

            // Set of event keys to prevent duplicates between initial server render and SSE playback
            const seenEvents = new Set();
            if (term) {
              const existing = term.querySelectorAll("[data-key]");
              for (const el of existing) {
                const k = el.getAttribute("data-key");
                if (k) seenEvents.add(k);
              }
            }

            if ("${job.status}" !== "complete" && "${job.status}" !== "failed") {
              const es = new EventSource(\`/dingdong/\${jobId}/stream\`);

              es.onmessage = (e) => {
                try {
                  const ev = JSON.parse(e.data);
                  const key = \`\${ev.timestamp}-\${ev.type}-\${ev.done ?? ''}-\${ev.current_url || ''}-\${ev.message || ''}\`;
                  if (seenEvents.has(key)) return;
                  seenEvents.add(key);

                  // Keep memory strictly bounded
                  while (term && term.children.length >= MAX_LINES) {
                    term.removeChild(term.firstChild);
                  }

                  const div = document.createElement("div");
                  div.style.marginBottom = "4px";
                  div.setAttribute("data-key", key);

                  let color = "#9ca3af";
                  if (ev.type === "phase") color = "#60a5fa";
                  if (ev.type === "progress") color = "#34d399";
                  if (ev.type === "error") color = "#f87171";
                  if (ev.type === "complete") color = "#a78bfa";
                  div.style.color = color;

                  const time = new Date(ev.timestamp || Date.now()).toLocaleTimeString();
                  const text = ev.message || ev.human || (ev.type === "progress" ? \`[\${ev.done}/\${ev.total}] \${ev.current_url}\` : JSON.stringify(ev));

                  div.innerHTML = \`<span style="color: #4b5563; margin-right: 8px;">\${time}</span> \${text}\`;
                  if (term) term.appendChild(div);
                  requestTerminalScroll();

                  if (ev.type === "complete") {
                    if (actionBox) {
                      actionBox.innerHTML = \`
                        <div style="background: var(--paper-2, #f5f4ef); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                          <div>
                            <b style="color: var(--ink);">Documentation Ready!</b>
                            <p style="margin: 0.2rem 0 0; font-size: 0.9rem; color: var(--dim-ink);">\${ev.message || "Extraction complete."}</p>
                          </div>
                          <a href="/docs/\${jobId}" class="btn btn-primary" style="padding: 0.6rem 1.2rem; text-decoration: none;">
                            Open Docs & Download ZIP →
                          </a>
                        </div>
                      \`;
                    }
                    es.close();
                  } else if (ev.type === "error") {
                    if (actionBox) {
                      actionBox.innerHTML = \`
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1.25rem;">
                          <b style="color: #b91c1c;">Extraction Failed</b>
                          <p style="margin: 0.4rem 0 0; color: #7f1d1d; font-size: 0.95rem;">\${ev.human || "Extraction failed."}</p>
                          \${ev.machine ? \`<p class="mono" style="margin-top: 0.5rem; font-size: 0.8rem; color: #991b1b; opacity: 0.8;">Detail: \${ev.machine}</p>\` : ""}
                        </div>
                      \`;
                    }
                    es.close();
                  }
                } catch (err) {
                  console.error("SSE parse error", err);
                }
              };

              let retryTimer = null;
              es.onerror = () => {
                // If the stream dropped temporarily, do not kill the UI. Check job status after 2s.
                if (retryTimer) return;
                retryTimer = setTimeout(async () => {
                  retryTimer = null;
                  try {
                    const res = await fetch(\`/api/jobs/\${jobId}\`);
                    if (res.ok) {
                      const data = await res.json();
                      if (data.job?.status === "complete") {
                        if (actionBox) {
                          actionBox.innerHTML = \`
                            <div style="background: var(--paper-2, #f5f4ef); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                              <div>
                                <b style="color: var(--ink);">Documentation Ready!</b>
                                <p style="margin: 0.2rem 0 0; font-size: 0.9rem; color: var(--dim-ink);">Extraction complete.</p>
                              </div>
                              <a href="/docs/\${jobId}" class="btn btn-primary" style="padding: 0.6rem 1.2rem; text-decoration: none;">
                                Open Docs & Download ZIP →
                              </a>
                            </div>
                          \`;
                        }
                        es.close();
                        return;
                      }
                      if (data.job?.status === "failed") {
                        if (actionBox) {
                          actionBox.innerHTML = \`
                            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1.25rem;">
                              <b style="color: #b91c1c;">Extraction Failed</b>
                              <p style="margin: 0.4rem 0 0; color: #7f1d1d; font-size: 0.95rem;">\${data.job.error_human || "Extraction failed."}</p>
                            </div>
                          \`;
                        }
                        es.close();
                        return;
                      }
                    }
                  } catch {}
                }, 2500);
              };
            }
          `,
        }}
      />
      <Footer />
    </>
  )
}
