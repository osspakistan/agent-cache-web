import { raw } from 'hono/html'
import { BrandMark } from '../components/brand-mark'
import { consumePageMeta } from '../lib/page-meta'
import type { LayoutComponent } from '../router/scan'

/**
 * Root layout - the ONE <html> shell.
 * Theme init runs inline before paint (shared 'ac-theme' key with the logo preview).
 */
const Layout: LayoutComponent = ({ children }) => {
  const meta = consumePageMeta()
  return (
    <>
      {raw('<!doctype html>')}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{meta.title}</title>
          <meta name="description" content={meta.description} />

          {/* OpenGraph / Twitter card - link previews */}
          <meta name="og:site_name" content="Agent Cache" />
          <meta property="og:title" content={meta.title} />
          <meta property="og:description" content={meta.description} />
          <meta property="og:type" content="website" />
          {meta.image && <meta property="og:image" content={meta.image} />}
          <meta name="twitter:card" content="summary_large_image" />
          {meta.image && <meta name="twitter:image" content={meta.image} />}
          {meta.canonical && <link rel="canonical" href={meta.canonical} />}
          {meta.jsonLd && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(meta.jsonLd),
              }}
            />
          )}
          {/* Organization JSON-LD - always present for brand verification */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Agent Cache',
                url: 'https://agentcache.run',
                description: 'Turn any documentation site into clean, agent-ready markdown docs.',
                logo: 'https://agentcache.run/favicon.svg',
                sameAs: ['https://github.com/agentcache/agent-cache'],
                contactPoint: {
                  '@type': 'ContactPoint',
                  contactType: 'customer support',
                  url: 'https://agentcache.run/contact',
                },
              }),
            }}
          />

          {/* Theme color - affects browser chrome (Safari tab bar, mobile status bar) */}
          <meta name="theme-color" content="#fffcf4" media="(prefers-color-scheme: light)" />
          <meta name="theme-color" content="#1a1917" media="(prefers-color-scheme: dark)" />

          {/* Favicon - SVG, no PNG fallbacks */}
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

          <link
            rel="preload"
            href="/fonts/newsreader/newsreader-v26-latin-500.woff2"
            as="font"
            type="font/woff2"
            crossorigin="anonymous"
          />
          <link rel="stylesheet" href="/tokens.css" />
          <link rel="stylesheet" href="/css/fonts.css" />
          <link rel="stylesheet" href="/css/app.css?v=2" />
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var t=localStorage.getItem('ac-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;})();`,
            }}
          />
          <script type="module" src="/js/htmx.esm.min.js"></script>
          <script src="/js/app.js" defer></script>
          {process.env.DEV_HOT_RELOAD === 'true' && (
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    function connect() {
                      const ws = new WebSocket('ws://' + location.hostname + ':10902');
                      ws.onmessage = function(e) {
                        if (e.data === 'reload') {
                          console.log('[hot-reload] Reloading page...');
                          location.reload();
                        }
                      };
                      ws.onclose = function() {
                        setTimeout(connect, 1000);
                      };
                    }
                    connect();
                  })();
                `,
              }}
            />
          )}
        </head>
        <body>
          {children}
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
                    <li>
                      <a
                        href="/compare/content-dev"
                        class="mono"
                        style="font-size: 13px; color: var(--body); text-decoration: none;"
                      >
                        vs content.dev
                      </a>
                    </li>
                    <li>
                      <a
                        href="/compare/parallel-web"
                        class="mono"
                        style="font-size: 13px; color: var(--body); text-decoration: none;"
                      >
                        vs parallel web
                      </a>
                    </li>
                    <li>
                      <a
                        href="/compare/llms-txt"
                        class="mono"
                        style="font-size: 13px; color: var(--body); text-decoration: none;"
                      >
                        vs llms.txt
                      </a>
                    </li>
                    <li>
                      <a
                        href="/compare/docsgpt"
                        class="mono"
                        style="font-size: 13px; color: var(--body); text-decoration: none;"
                      >
                        vs docsgpt
                      </a>
                    </li>
                    <li>
                      <a
                        href="/compare/docuchat"
                        class="mono"
                        style="font-size: 13px; color: var(--body); text-decoration: none;"
                      >
                        vs docuchat
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
                        href="/blog/100-sites-extracted"
                        class="mono"
                        style="font-size: 13px; color: var(--body); text-decoration: none;"
                      >
                        100 sites extracted
                      </a>
                    </li>
                    <li>
                      <a
                        href="/blog/acquisition-ladder"
                        class="mono"
                        style="font-size: 13px; color: var(--body); text-decoration: none;"
                      >
                        acquisition ladder
                      </a>
                    </li>
                    <li>
                      <a
                        href="/blog/why-no-llm-extraction"
                        class="mono"
                        style="font-size: 13px; color: var(--body); text-decoration: none;"
                      >
                        why no llm
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
                        href="/openapi.json"
                        class="mono"
                        style="font-size: 13px; color: var(--body); text-decoration: none;"
                      >
                        openapi
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
        </body>
      </html>
    </>
  )
}

export default Layout
