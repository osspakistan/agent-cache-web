import { BrandMark } from './brand-mark'

export function Footer() {
  return (
    <footer style="margin-top: 80px; border-top: 1px solid var(--border-soft); background: var(--secondary);">
      <div class="wrap" style="padding: 48px 0 32px;">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 48px; margin-bottom: 48px;">
          {/* product */}
          <div>
            <p
              class="mono"
              style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); margin-bottom: 16px;"
            >
              product
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">
              <li>
                <a
                  href="/"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  add docs
                </a>
              </li>
              <li>
                <a
                  href="/docs"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  library
                </a>
              </li>
            </ul>
          </div>

          {/* compare */}
          <div>
            <p
              class="mono"
              style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); margin-bottom: 16px;"
            >
              compare
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">
              <li>
                <a
                  href="/compare"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  all comparisons
                </a>
              </li>
              <li>
                <a
                  href="/compare/context7"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  vs context7
                </a>
              </li>
              <li>
                <a
                  href="/compare/firecrawl"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  vs firecrawl
                </a>
              </li>
              <li>
                <a
                  href="/compare/tavily"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  vs tavily
                </a>
              </li>
            </ul>
          </div>

          {/* resources */}
          <div>
            <p
              class="mono"
              style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); margin-bottom: 16px;"
            >
              resources
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">
              <li>
                <a
                  href="/blog"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  blog
                </a>
              </li>
              <li>
                <a
                  href="/llms.txt"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  llms.txt
                </a>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  sitemap
                </a>
              </li>
            </ul>
          </div>

          {/* company */}
          <div>
            <p
              class="mono"
              style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); margin-bottom: 16px;"
            >
              company
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">
              <li>
                <a
                  href="/about"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  about
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  contact
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  privacy
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/agentcache/agent-cache"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  github
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* bottom bar */}
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 32px; border-top: 1px solid var(--border);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <BrandMark size="sm" px={20} />
            <span class="mono" style="font-size: 12px; color: var(--muted-foreground);">
              agent-cache. turn any docs into agent-ready markdown.
            </span>
          </div>
          <p class="mono" style="font-size: 12px; color: var(--muted-foreground); margin: 0;">
            (c) 2026 agent cache. mit license.
          </p>
        </div>
      </div>
    </footer>
  )
}
