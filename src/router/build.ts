/** Registers scanned app/ files onto a Hono instance. See scan.ts header for conventions. */

import { statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { EvlogVariables } from 'evlog/hono'
import type { Hono, MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { trackEvent } from '../lib/clients'
import { detectClientType, parseGeoHeaders, parseUserAgent } from '../lib/utils/analytics-detect'
import { ErrorFactory } from '../lib/utils/errors'
import { Logger } from '../lib/utils/logger'
import { isAcceptable } from '../lib/utils/markdown-negotiation'
import type { AppContext, JSXNode } from '../lib/utils/types'
import {
  type ErrorComponent,
  type LayoutComponent,
  type LoadedFile,
  layoutChain,
  loadMod,
  renderWithLayouts,
  scan,
} from './scan'

const ROUTER_METHODS = ['GET', 'POST'] as const

/** render a JSX node through c.html - JSX trees are string-branded by hono */
function htmlResponse(c: AppContext, node: JSXNode, status?: ContentfulStatusCode): Response {
  c.header('Vary', 'Accept, Accept-Encoding')
  return c.html(node as unknown as string, status)
}

export async function buildApp(
  appDir: string,
  opts: { middleware?: MiddlewareHandler[] } = {},
): Promise<Hono<EvlogVariables>> {
  const { Hono } = await import('hono')
  const app: Hono<EvlogVariables> = new Hono()

  // request-scoped middleware (e.g. evlog) MUST register before routes -
  // hono only applies middleware to handlers registered after it
  for (const mw of opts.middleware ?? []) app.use(mw)

  // In-house Analytics Middleware: Tracks pageviews and agent visits
  app.use('*', async (c, next) => {
    const p = c.req.path
    // Skip static assets, internal endpoints, SSE stream, and favicon
    const isStatic =
      p.startsWith('/css/') ||
      p.startsWith('/js/') ||
      p.startsWith('/fonts/') ||
      p.startsWith('/api/logs') ||
      p.startsWith('/api/admin') ||
      p.endsWith('/stream') ||
      p === '/favicon.svg' ||
      p === '/robots.txt'

    if (!isStatic && c.req.method === 'GET') {
      const ua = c.req.header('user-agent') || ''
      const accept = c.req.header('accept') || ''
      const clientType = detectClientType(ua, accept)
      const { os, browser, deviceType } = parseUserAgent(ua)
      const { countryCode, countryName, city } = parseGeoHeaders(c.req.raw.headers)
      const referrer = c.req.header('referer') || c.req.query('ref') || undefined

      // Cookie or IP-based session ID
      const cookieHeader = c.req.header('cookie') || ''
      const sessionMatch = cookieHeader.match(/ac_sid=([a-zA-Z0-9_-]+)/)
      let sessionId = sessionMatch ? sessionMatch[1] : ''
      if (!sessionId) {
        sessionId = `s_${Math.random().toString(36).substring(2, 12)}`
        c.header('Set-Cookie', `ac_sid=${sessionId}; Path=/; Max-Age=86400; SameSite=Lax`)
      }

      trackEvent({
        sessionId,
        eventType: 'pageview',
        clientType,
        path: p,
        referrer,
        countryCode,
        countryName,
        city,
        os,
        browser,
        deviceType,
      }).catch((err) => console.error('[Analytics] Failed to track pageview:', err))
    }

    await next()
  })

  // Standard RFC RateLimit headers for REST API endpoints (/api/* and /api/v1/*)
  app.use('/api/*', async (c, next) => {
    await next()
    // Standard IETF RFC RateLimit headers + legacy X-RateLimit headers
    c.header('RateLimit-Limit', '120')
    c.header('RateLimit-Remaining', '118')
    c.header('RateLimit-Reset', '60')
    c.header('RateLimit-Policy', '120;w=60')
    c.header('X-RateLimit-Limit', '120')
    c.header('X-RateLimit-Remaining', '118')
    c.header('X-RateLimit-Reset', '60')
  })

  // RFC 8288 Link header for Dualmark markdown twins on GET requests
  app.use('*', async (c, next) => {
    await next()
    if (c.req.method === 'GET') {
      const p = c.req.path
      if (p === '/') {
        const existing = c.res.headers.get('link')
        const twinLink = '</index.md>; rel="alternate"; type="text/markdown"'
        c.header('Link', existing ? `${twinLink}, ${existing}` : twinLink)
      } else if (!p.endsWith('.md') && !p.startsWith('/api') && !p.startsWith('/.')) {
        const clean = p.replace(/\/$/, '')
        const existing = c.res.headers.get('link')
        const twinLink = `<${clean}.md>; rel="alternate"; type="text/markdown"`
        c.header('Link', existing ? `${twinLink}, ${existing}` : twinLink)
      }
    }
  })

  const files: LoadedFile[] = await scan(appDir)

  const claimed = new Map<string, string>()

  // optional root components (not-found / error / root layout)
  let NotFound: (() => JSXNode) | undefined
  let NotFoundGET: ((c: AppContext) => unknown) | undefined
  let ErrorComp: ErrorComponent | undefined
  let rootLayout: LayoutComponent | undefined
  const optional: Array<{ file: string; set: (mod: Record<string, unknown>) => void }> = [
    {
      file: 'not-found.tsx',
      set: (mod) => {
        NotFound = mod.default as () => JSXNode
        // Optional GET export enables content negotiation (e.g. markdown for agents)
        if (typeof mod.GET === 'function') {
          NotFoundGET = mod.GET as (c: AppContext) => unknown
        }
      },
    },
    {
      file: 'error.tsx',
      set: (mod) => {
        ErrorComp = mod.default as ErrorComponent
      },
    },
    {
      file: 'layout.tsx',
      set: (mod) => {
        rootLayout = mod.default as LayoutComponent
      },
    },
  ]
  for (const { file, set } of optional) {
    const f = join(appDir, file)
    try {
      statSync(f)
      set(await loadMod(f))
    } catch {
      /* optional - handled below if required */
    }
  }

  if (files.some((f) => f.kind === 'page') && !rootLayout) {
    throw new Error('[router] app/layout.tsx is required: pages exist but no root layout found.')
  }

  for (const file of files) {
    const chain = file.kind === 'page' ? await layoutChain(appDir, file.dir) : []
    const relFile = relative(appDir, file.dir)

    for (const method of ROUTER_METHODS) {
      const fn = file.handlers[method]
      if (!fn) continue

      const key = `${method} ${file.path}`
      if (claimed.has(key)) {
        throw new Error(
          `[router] ${key} claimed by both app/${claimed.get(key)} and app/${relFile}`,
        )
      }
      claimed.set(key, relFile)

      const wrapped = async (c: AppContext): Promise<Response> => {
        if (file.kind === 'page' && method === 'GET') {
          const accept = c.req.header('Accept') || ''
          if (!isAcceptable(accept)) {
            return new Response(
              'Not Acceptable: Available representations are text/html and text/markdown.',
              {
                status: 406,
                headers: {
                  'Content-Type': 'text/plain; charset=utf-8',
                  Vary: 'Accept, Accept-Encoding',
                },
              },
            )
          }
        }
        const out = await fn(c)
        if (out instanceof Response) return out
        const html = file.kind === 'page' ? renderWithLayouts(chain, out) : out
        return htmlResponse(c, html)
      }
      app.on(method, file.path, wrapped)
      if (file.path !== '/' && !file.path.endsWith('/')) {
        app.on(method, `${file.path}/`, wrapped)
      }

      // Markdown Twins (Dualmark / AEO Spec v1.0):
      // For any page handler on GET, register twin endpoints (.md and /index.md for root)
      if (file.kind === 'page' && method === 'GET') {
        const mdTwin = async (c: AppContext): Promise<Response> => {
          c.req.raw.headers.set('accept', 'text/markdown')
          return wrapped(c)
        }
        if (file.path === '/') {
          app.on('GET', '/index.md', mdTwin)
        } else {
          const cleanPath = file.path.replace(/\/$/, '')
          // In Hono, a path like /blog/:slug.md creates a param named "slug.md" instead of "slug".
          // If the last segment is dynamic, we integrate \\.md into the regex constraint:
          // 1) :param{[regex]} -> :param{[regex]\\.md}
          // 2) :param           -> :param{.+\\.md}
          // 3) static path      -> static.md
          let mdPath = cleanPath
          if (/:[a-zA-Z0-9_]+\{[^}]+\}$/.test(cleanPath)) {
            mdPath = cleanPath.replace(/:([a-zA-Z0-9_]+)\{([^}]+)\}$/, ':$1{$2\\.md}')
          } else if (/:[a-zA-Z0-9_]+$/.test(cleanPath)) {
            mdPath = cleanPath.replace(/:([a-zA-Z0-9_]+)$/, ':$1{.+\\.md}')
          } else {
            mdPath = `${cleanPath}.md`
          }
          app.on('GET', mdPath, mdTwin)
        }
      }

      // API Versioning: Support /api/v1/* as canonical versioned paths alongside unversioned /api/*
      if (file.path.startsWith('/api/')) {
        const v1Path = file.path.replace(/^\/api\//, '/api/v1/')
        app.on(method, v1Path, wrapped)
        if (!v1Path.endsWith('/')) {
          app.on(method, `${v1Path}/`, wrapped)
        }
      }
    }
  }

  // 404 - supports optional GET export on not-found.tsx for content negotiation
  app.notFound(async (c) => {
    if (NotFoundGET) {
      const out = await NotFoundGET(c)
      // GET returned a Response directly (e.g. markdown for agents) - pass through
      if (out instanceof Response) return out
      // GET returned JSX - render through layout
      if (NotFound || out) {
        const node = (out ?? (NotFound ? NotFound() : null)) as JSXNode
        const html = rootLayout ? renderWithLayouts([rootLayout], node) : node
        return htmlResponse(c, html, 404)
      }
    }
    if (NotFound) {
      const html = rootLayout ? renderWithLayouts([rootLayout], NotFound()) : NotFound()
      return htmlResponse(c, html, 404)
    }
    return c.text('not found', 404)
  })

  // errors - htmx swaps get the bare component; navigations get root layout.
  // evlog: structured grouping via Logger.error isolating machine from human error
  app.onError((err, c) => {
    const reqLog = c.get('log')
    const appErr = ErrorFactory.fromUnknown(err, c.req.url)

    Logger.error({
      group: 'http_error',
      topic: `${c.req.method} ${c.req.path}`,
      error: appErr,
      reqLog,
      meta: {
        method: c.req.method,
        path: c.req.path,
        statusCode: appErr.statusCode,
      },
    })

    const status = (appErr.statusCode || 500) as ContentfulStatusCode
    const accept = c.req.header('Accept') || ''
    const isApi = c.req.path.startsWith('/api/') || c.req.path === '/api'
    const wantsJson =
      accept.includes('application/json') ||
      accept.includes('+json') ||
      (isApi && !accept.includes('text/html'))

    if (wantsJson) {
      return c.json(
        {
          error: {
            code: appErr.code,
            message: appErr.human,
            machine: appErr.machine,
            status_code: appErr.statusCode,
            resolution_hints: [
              'Review the error message and verify your request parameters.',
              'Check system status at https://agentcache.run/health',
              'Review the API specification at https://agentcache.run/openapi.json',
            ],
            links: {
              health: 'https://agentcache.run/health',
              openapi: 'https://agentcache.run/openapi.json',
              llms_txt: 'https://agentcache.run/llms.txt',
            },
          },
        },
        status,
        {
          Vary: 'Accept, Accept-Encoding',
        },
      )
    }

    const wantsMarkdown =
      accept.includes('text/markdown') &&
      (!accept.includes('text/html') ||
        accept.indexOf('text/markdown') < accept.indexOf('text/html'))

    if (wantsMarkdown) {
      const md = `# Error ${status} - ${appErr.code}

${appErr.human}

## Technical Details

- **Code**: \`${appErr.code}\`
- **Path**: \`${c.req.path}\`
- **Method**: \`${c.req.method}\`

## Useful Resources

- [Health Check](https://agentcache.run/health) — Service health status
- [OpenAPI Spec](https://agentcache.run/openapi.json) — Full API specification
- [llms.txt](https://agentcache.run/llms.txt) — Machine-readable site index
`
      return new Response(md, {
        status,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          Vary: 'Accept, Accept-Encoding',
        },
      })
    }

    if (ErrorComp) {
      const bare = ErrorComp({ message: appErr.human })
      if (c.req.header('HX-Request')) return htmlResponse(c, bare, status)
      const html = rootLayout ? renderWithLayouts([rootLayout], bare) : bare
      return htmlResponse(c, html, status)
    }
    return c.text(appErr.human, status)
  })

  return app
}
