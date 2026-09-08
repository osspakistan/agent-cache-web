export function Batteries() {
  return (
    <section aria-labelledby="s2">
      <h2 id="s2">Batteries included</h2>
      <p class="sec-note">
        Everything the bundle needs to survive contact with a real agent session.
      </p>

      <div class="blk">
        <div class="tile" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <g fill="none" stroke="var(--ok)" stroke-width="3">
              <rect x="8" y="8" width="20" height="20" rx="4" />
              <circle cx="30" cy="30" r="8" />
            </g>
          </svg>
        </div>
        <div>
          <h3>The whole site, not a summary</h3>
          <p>
            Every page ships in full. Not a summary. Summaries skip the paragraph your agent needed.
            Code examples stay intact, links keep working offline.
          </p>
          <div class="rows">
            <div class="row">
              <span class="ic">→</span>every page included
            </div>
            <div class="row">
              <span class="ic">→</span>code examples untouched
            </div>
            <div class="row">
              <span class="ic">→</span>links between pages still work offline
            </div>
          </div>
        </div>
      </div>

      <div class="blk">
        <div class="tile" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <g fill="var(--primary)">
              <rect x="8" y="8" width="8" height="8" rx="2" />
              <rect x="20" y="8" width="8" height="8" rx="2" />
              <rect x="32" y="8" width="6" height="8" rx="2" />
              <rect x="8" y="20" width="8" height="8" rx="2" />
              <rect x="20" y="20" width="8" height="8" rx="2" />
              <rect x="32" y="20" width="6" height="8" rx="2" />
              <rect x="8" y="32" width="8" height="6" rx="2" />
              <rect x="20" y="32" width="8" height="6" rx="2" />
              <rect x="32" y="32" width="6" height="6" rx="2" />
            </g>
          </svg>
        </div>
        <div>
          <h3>Same input, same output.</h3>
          <p>
            I resolve the URL, pick the cheapest acquisition that works, and pack the bundle. Point
            it at a URL and walk away.
          </p>
          <div class="rows">
            <div class="row">
              <span class="ic">→</span>no setup, no accounts
            </div>
            <div class="row">
              <span class="ic">→</span>works with any docs site
            </div>
            <div class="row">
              <span class="ic">→</span>same input, same output
            </div>
          </div>
        </div>
      </div>

      <div class="blk">
        <div class="tile" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <g fill="var(--accent)">
              <circle cx="12" cy="12" r="5" />
              <circle cx="26" cy="12" r="5" />
              <circle cx="12" cy="26" r="5" />
              <circle cx="26" cy="26" r="5" />
              <circle cx="36" cy="34" r="6" />
            </g>
          </svg>
        </div>
        <div>
          <h3>Your agent finds the right page fast</h3>
          <p>
            Every bundle has a <b>map of every page</b> so your agent opens only what it needs. Plus
            where the docs came from, when I fetched them, and the GitHub repo if I found one.
          </p>
          <div class="rows">
            <div class="row">
              <span class="ic">→</span>_map.json · every page, structured
            </div>
            <div class="row">
              <span class="ic">→</span>meta.yaml · where it all came from
            </div>
            <div class="row">
              <span class="ic">→</span>mcp server (soon) reads the same files
            </div>
          </div>
        </div>
      </div>

      <div class="blk">
        <div class="tile" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <g fill="none" stroke="var(--primary)" stroke-width="3">
              <path d="M10 30 V 16 a4 4 0 0 1 4-4 h16 a4 4 0 0 1 4 4 v14" />
              <path d="M6 30 h32" />
            </g>
            <circle cx="22" cy="35" r="3.5" fill="var(--primary)" />
          </svg>
        </div>
        <div>
          <h3>A folder in your repo.</h3>
          <p>
            Plain files on your disk. Gitignore them or commit them. Works offline, nothing phones
            home.
          </p>
          <div class="rows">
            <div class="row">
              <span class="ic">→</span>no account required
            </div>
            <div class="row">
              <span class="ic">→</span>works offline after download
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
