import { raw } from 'hono/html'
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
          <link rel="stylesheet" href="/css/app.css" />
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
        <body>{children}</body>
      </html>
    </>
  )
}

export default Layout
