import { raw } from 'hono/html'
import { Footer } from '../components/footer'
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
          {meta.canonical && <meta property="og:url" content={meta.canonical} />}
          {meta.image && <meta property="og:image" content={meta.image} />}
          {meta.image && <meta property="og:image:type" content="image/png" />}
          {meta.image && <meta property="og:image:width" content="1200" />}
          {meta.image && <meta property="og:image:height" content="630" />}
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
                alternateName: ['AgentCache', 'agentcache.run', 'Agent Cache Web'],
                legalName: 'Agent Cache',
                url: 'https://agentcache.run',
                description: 'Turn any documentation site into clean, agent-ready markdown docs.',
                logo: 'https://agentcache.run/favicon.svg',
                sameAs: ['https://github.com/agentcache/agent-cache', 'https://agentcache.run'],
                contactPoint: {
                  '@type': 'ContactPoint',
                  contactType: 'customer support',
                  url: 'https://agentcache.run/contact',
                  email: 'hi@agentcache.run',
                },
                address: {
                  '@type': 'PostalAddress',
                  addressCountry: 'US',
                },
              }),
            }}
          />

          {/* Theme color - affects browser chrome (Safari tab bar, mobile status bar) */}
          <meta name="theme-color" content="#fffcf4" media="(prefers-color-scheme: light)" />
          <meta name="theme-color" content="#1a1917" media="(prefers-color-scheme: dark)" />

          {/* Favicon - SVG, no PNG fallbacks */}
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

          {/* RFC 8288 / Agent Discovery Link Relations */}
          <link rel="api-catalog" href="/.well-known/api-catalog" type="application/linkset+json" />
          <link rel="service-desc" href="/openapi.json" type="application/json" />
          <link rel="service-doc" href="/llms.txt" type="text/plain" />
          <link rel="ai-catalog" href="/.well-known/ai-catalog.json" type="application/json" />
          <link
            rel="describedby"
            href="/.well-known/agent-skills/index.json"
            type="application/json"
          />
          <link
            rel="service-desc"
            href="/.well-known/mcp/server-card.json"
            type="application/json"
          />
          <link rel="authorizing-agent" href="/auth.md" type="text/markdown" />

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
          <Footer />
        </body>
      </html>
    </>
  )
}

export default Layout
