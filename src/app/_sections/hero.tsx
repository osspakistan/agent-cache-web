import { PillForm } from '../../components/pill-form'

export function Hero(props: { captured?: string }) {
  return (
    <div class="hero">
      <h1>Give your agents the docs.</h1>
      <p class="lede">
        Paste a docs URL. The whole site comes back as clean markdown your agent can read. Banners,
        nav, cookie popups all stripped.{' '}
        <span class="dim">Drop the folder in your repo and point your agent at it.</span>
      </p>
      <p class="stack-note">
        Works with <b>Claude Code</b>, <b>Codex</b>, <b>Cursor</b>, <b>Windsurf</b>, any agent that
        reads files.
      </p>

      <PillForm />

      {props.captured ? (
        <p class="exp-note">
          <b>url captured</b> ·{' '}
          <span class="mono" style="color:var(--ink)">
            {props.captured}
          </span>{' '}
          · the web app ships with the backend. ping{' '}
          <a href="mailto:hi@agent-cache.dev" style="color:var(--accent-ink)">
            hi@agent-cache.dev
          </a>{' '}
          for early access.
        </p>
      ) : (
        <p class="exp-note">
          <b>drop the folder in.</b> ·{' '}
          <a href="#setup">wire into Claude Code, Cursor, Codex, or MCP →</a>
        </p>
      )}

      {/* hand-built SVG: tangled docs site → clean cached stack */}
      <div class="hero-svg">
        <svg viewBox="0 0 640 190" fill="none" aria-hidden="true">
          <g stroke="currentColor" stroke-width="2" opacity="0.85" style="color: var(--ink)">
            <path d="M60 95 C 80 40, 150 30, 175 75 S 120 160, 85 130 S 40 70, 105 55 S 190 60, 160 120 S 90 175, 70 120" />
            <path d="M70 90 C 100 60, 160 140, 130 60 S 95 150, 140 100" />
          </g>
          <circle cx="98" cy="66" r="7" fill="var(--accent)" />
          <circle cx="152" cy="112" r="5" fill="var(--primary)" />
          <circle cx="78" cy="132" r="5" fill="var(--primary)" />
          <path
            d="M195 95 C 265 95, 320 95, 395 95"
            stroke="currentColor"
            stroke-width="2"
            style="color:var(--muted-foreground)"
            stroke-dasharray="2 7"
          />
          <g stroke="currentColor" stroke-width="2.5" style="color: var(--ink)">
            <rect x="420" y="118" width="120" height="34" rx="9" />
            <rect x="428" y="78" width="120" height="34" rx="9" />
            <rect x="436" y="38" width="120" height="34" rx="9" />
          </g>
          <rect x="436" y="38" width="120" height="34" rx="9" fill="var(--accent)" opacity="0.18" />
          <text
            x="452"
            y="60"
            font-family="IBM Plex Mono, monospace"
            font-size="12"
            fill="currentColor"
            style="color:var(--ink)"
          >
            .md
          </text>
          <text
            x="446"
            y="100"
            font-family="IBM Plex Mono, monospace"
            font-size="12"
            fill="currentColor"
            style="color:var(--ink)"
          >
            .md
          </text>
          <text
            x="438"
            y="140"
            font-family="IBM Plex Mono, monospace"
            font-size="12"
            fill="currentColor"
            style="color:var(--ink)"
          >
            .md
          </text>
          <path
            d="M560 45 l16 0"
            stroke="currentColor"
            style="color:var(--ok)"
            stroke-width="2.5"
          />
        </svg>
      </div>
    </div>
  )
}
