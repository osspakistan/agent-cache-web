/** 500 component - rendered bare for htmx swaps, wrapped in layout for navigations. */
export default function ErrorPage(props: { message: string }) {
  const isDev = process.env.NODE_ENV !== 'production'

  // Clean out low-level Bun runtime socket diagnostics
  const cleanMessage = props.message
    .replace(/For more information, pass `verbose: true`.*$/i, '')
    .trim()

  const isSocketErr = /socket connection was closed|ECONNRESET/i.test(cleanMessage)

  return (
    <div
      class="wrap"
      style="padding: 96px 20px; text-align: center; max-width: 680px; margin: 0 auto;"
    >
      <span
        class="mono"
        style="font-size: 12px; color: #b91c1c; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"
      >
        500 · Server Hiccup
      </span>
      <h1 style="margin: 12px 0 16px;">Something broke.</h1>
      <p class="lede" style="margin-bottom: 24px;">
        {isSocketErr
          ? 'The remote server suddenly dropped the connection. Try again in a minute.'
          : 'My fault, not yours. I ran into an unexpected snag handling this request.'}
      </p>

      {isDev && cleanMessage && (
        <details style="text-align: left; background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; margin-top: 24px;">
          <summary
            class="mono"
            style="font-size: 11.5px; color: var(--ink-soft); cursor: pointer; user-select: none;"
          >
            Diagnostics (dev mode) ▸
          </summary>
          <pre
            class="mono"
            style="margin: 8px 0 0; font-size: 12px; color: #991b1b; white-space: pre-wrap; word-break: break-all;"
          >
            {cleanMessage}
          </pre>
        </details>
      )}

      <div style="margin-top: 32px;">
        <a href="/" class="secondary" style="display: inline-block;">
          ← Back to home
        </a>
      </div>
    </div>
  )
}
