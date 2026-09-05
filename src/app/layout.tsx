import { raw } from 'hono/html'
import type { LayoutComponent } from '../router/scan'

/**
 * Root layout — the ONE <html> shell.
 * Theme init runs inline before paint (shared 'ac-theme' key with the logo preview).
 */
const Layout: LayoutComponent = ({ children }) => {
  return (
    <>
      {raw('<!doctype html>')}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Agent Cache — give your agents the docs</title>
          <meta
            name="description"
            content="Paste a docs URL. Get the whole site back as clean markdown files your coding agent can actually read."
          />

          {/* OpenGraph / Twitter card — link previews */}
          <meta property="og:title" content="Agent Cache — give your agents the docs" />
          <meta
            property="og:description"
            content="Paste a docs URL. Get the whole site back as clean markdown files your coding agent can actually read."
          />
          <meta property="og:type" content="website" />

          {/* Theme color — affects browser chrome (Safari tab bar, mobile status bar) */}
          <meta name="theme-color" content="#fffcf4" media="(prefers-color-scheme: light)" />
          <meta name="theme-color" content="#1a1917" media="(prefers-color-scheme: dark)" />

          {/* Favicon — SVG, no PNG fallbacks */}
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
