/**
 * File-based router - the scanner.
 *
 * Walks src/app/ and registers routes on a Hono instance. The folder tree IS the
 * routing table (see docs/architecture.md → "Routing").
 *
 * Magic file names:
 *   page.ts(x)            GET, full page, wrapped in nearest layout.ts chain
 *   *.fragment.ts(x)      GET and/or POST, HTML partial for htmx, NO layout
 *   route.ts / *.route.ts any HTTP method, non-HTML (JSON, streams), NO layout
 *   layout.ts(x)          wraps every page nested under it (root layout required)
 *   not-found.ts(x)       404 component (root only)
 *   error.ts(x)           500 component (root only)
 *
 * Handler contract: named HTTP-method exports (export const GET / POST / ...).
 * A handler returns either a Response or a JSX node:
 *   - page JSX is wrapped in the layout chain, then rendered via c.html()
 *   - fragment JSX is rendered via c.html() with NO layout
 *   - a returned Response is passed through untouched
 *
 * Path mapping: [id] → :id, [...slug] → *. `_`-prefixed names are private
 * colocation and invisible to the scanner.
 * Conflicts (two files claiming the same path+method) → boot failure.
 */

import { readdirSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import type { AppHandler, JSXNode } from '../lib/utils/types'

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type AsyncHandler = AppHandler
export type LayoutComponent = (props: { children: JSXNode }) => JSXNode
export type ErrorComponent = (props: { message: string }) => JSXNode

export interface LoadedFile {
  kind: 'page' | 'fragment' | 'route'
  path: string
  dir: string
  handlers: Partial<Record<Method, AsyncHandler>>
}

const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const HANDLER_RX = /^(page|route)\.(ts|tsx)$|^[\w-]+\.(fragment|route)\.(ts|tsx)$/
const FRAGMENT_RX = /^[\w-]+\.fragment\.(ts|tsx)$/

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir).sort()) {
    if (entry.startsWith('_')) continue // private colocation - invisible
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

function mapSegment(seg: string): string {
  const catchAll = seg.match(/^\[\.\.\.(.+)\]$/)
  if (catchAll) return `*${catchAll[1]}`
  if (seg.startsWith('[') && seg.endsWith(']')) return `:${seg.slice(1, -1)}`
  return seg
}

function leafOf(name: string): string {
  const base = name.replace(/\.(ts|tsx)$/, '')
  if (base === 'page' || base === 'route') return ''
  return base.replace(/\.(fragment|route)$/, '')
}

function urlPath(appDir: string, file: string): string {
  const dir = relative(appDir, join(file, '..'))
  const segments = dir.split(/[\\/]/).filter(Boolean).map(mapSegment)
  const leaf = leafOf(basename(file))
  const parts = [...segments, leaf].filter(Boolean)
  return `/${parts.join('/')}`
}

export async function loadMod(file: string): Promise<Record<string, unknown>> {
  return await import(file)
}

function kindOf(name: string): 'page' | 'fragment' | 'route' | null {
  if (/^page\.(ts|tsx)$/.test(name)) return 'page'
  if (FRAGMENT_RX.test(name)) return 'fragment'
  if (HANDLER_RX.test(name)) return 'route'
  return null
}

export async function scan(appDir: string): Promise<LoadedFile[]> {
  const loaded: LoadedFile[] = []
  for (const file of walk(appDir)) {
    const name = basename(file)
    const rel = relative(appDir, file)
    const kind = kindOf(name)
    if (!kind) continue

    const mod = await loadMod(file)
    const handlers: LoadedFile['handlers'] = {}
    for (const m of METHODS) {
      if (typeof mod[m] === 'function') handlers[m] = mod[m] as unknown as AsyncHandler
    }
    if (Object.keys(handlers).length === 0) {
      throw new Error(
        `[router] app/${rel}: no HTTP method exports (expected e.g. export const GET).`,
      )
    }
    if (kind === 'page' && Object.keys(handlers).length > 1) {
      throw new Error(`[router] app/${rel}: page.ts is GET-only.`)
    }
    loaded.push({ kind, path: urlPath(appDir, file), dir: join(file, '..'), handlers })
  }
  return loaded
}

// layouts from root down to dir (outermost first)
export async function layoutChain(appDir: string, dir: string): Promise<LayoutComponent[]> {
  const chain: LayoutComponent[] = []
  const segments = relative(appDir, dir).split(/[\\/]/).filter(Boolean)
  let current = appDir
  for (let i = 0; i <= segments.length; i++) {
    for (const ext of ['tsx', 'ts']) {
      const f = join(current, `layout.${ext}`)
      try {
        statSync(f)
        const mod = await loadMod(f)
        chain.push(mod.default as LayoutComponent)
        break
      } catch {
        /* no layout at this level */
      }
    }
    if (i < segments.length) current = join(current, segments[i])
  }
  return chain
}

export function renderWithLayouts(chain: LayoutComponent[], node: JSXNode): JSXNode {
  return chain.reduceRight<JSXNode>((acc, Layout) => Layout({ children: acc }), node)
}

export { METHODS }
