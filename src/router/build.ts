/** Registers scanned app/ files onto a Hono instance. See scan.ts header for conventions. */

import { statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { EvlogVariables } from 'evlog/hono'
import type { Hono, MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ErrorFactory } from '../lib/utils/errors'
import { Logger } from '../lib/utils/logger'
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

  const files: LoadedFile[] = await scan(appDir)

  const claimed = new Map<string, string>()

  // optional root components (not-found / error / root layout)
  let NotFound: (() => JSXNode) | undefined
  let ErrorComp: ErrorComponent | undefined
  let rootLayout: LayoutComponent | undefined
  const optional: Array<{ file: string; set: (mod: Record<string, unknown>) => void }> = [
    {
      file: 'not-found.tsx',
      set: (mod) => {
        NotFound = mod.default as () => JSXNode
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
        const out = await fn(c)
        if (out instanceof Response) return out
        const html = file.kind === 'page' ? renderWithLayouts(chain, out) : out
        return htmlResponse(c, html)
      }
      app.on(method, file.path, wrapped)
      if (file.path !== '/' && !file.path.endsWith('/')) {
        app.on(method, `${file.path}/`, wrapped)
      }
    }
  }

  // 404
  app.notFound((c) => {
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
