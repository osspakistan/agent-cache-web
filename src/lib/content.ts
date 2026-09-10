// Server-side registry for the Markdown collections in content/.
// Blog URLs come from **slug:** metadata; filenames remain redirect aliases.
// Comparisons use the /compare namespace. All lists, detail pages and the
// sitemap read this registry so their URLs cannot drift apart.

import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { renderHtml } from '@comark/html'

export type ContentSection = 'blog' | 'compare'

export interface ContentPost {
  slug: string
  route: string
  /** Previous filename-based URLs, retained for bookmarks and indexed pages. */
  aliases: string[]
  title: string
  metaTitle: string
  description: string
  sourceSlug?: string
  keywords?: string
  /** optional **date:** meta line, used for feed pubDate when present */
  date?: string
  html: string
  body: string
  file: string
}

interface ParseResult {
  meta: Record<string, string>
  body: string
}

const CONTENT_DIR = resolve(import.meta.dir, '../../content')
const SECTIONS: ContentSection[] = ['blog', 'compare']
let pending: Promise<Record<ContentSection, ContentPost[]>> | undefined

/** Draft format: H1 + **key:** value lines, then a --- body separator. */
export function parseContent(source: string): ParseResult {
  const raw = source.replace(/\r\n/g, '\n')
  const separator = raw.indexOf('\n---\n')
  if (separator === -1) throw new Error('Content is missing its metadata separator')
  const meta: Record<string, string> = {}
  for (const line of raw.slice(0, separator).split('\n')) {
    const match = line.match(/^\*\*(.+?):\*\*\s*(.*)$/)
    if (match) meta[match[1].trim()] = match[2].trim()
  }
  return { meta, body: raw.slice(separator + 5).trim() }
}

/** Validate metadata rather than silently publishing an unexpected URL. */
export function contentAddress(section: ContentSection, file: string, sourceSlug?: string) {
  const filename = file.replace(/\.md$/, '')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(filename)) {
    throw new Error(`Invalid content filename: ${file}`)
  }
  const route = sourceSlug ?? `/${section}/${filename}`
  const pattern = new RegExp(`^/${section}/([a-z0-9]+(?:-[a-z0-9]+)*)$`)
  const match = route.match(pattern)
  if (!match) throw new Error(`Invalid ${section} slug in ${file}: ${route}`)
  const previousRoute = `/${section}/${filename}`
  return {
    slug: match[1],
    route,
    aliases: route === previousRoute ? [] : [previousRoute],
  }
}

/** Canonical URLs and aliases must both be unique within a collection. */
export function validateContentAddresses(posts: Pick<ContentPost, 'route' | 'aliases' | 'file'>[]) {
  const owners = new Map<string, string>()
  for (const post of posts) {
    for (const route of [post.route, ...post.aliases]) {
      const owner = owners.get(route)
      if (owner) throw new Error(`Content URL collision at ${route}: ${owner}, ${post.file}`)
      owners.set(route, post.file)
    }
  }
}

async function load(): Promise<Record<ContentSection, ContentPost[]>> {
  const collections: Record<ContentSection, ContentPost[]> = { blog: [], compare: [] }
  for (const section of SECTIONS) {
    // Missing shipped content is an error, not a successful empty index.
    const files = (await readdir(join(CONTENT_DIR, section)))
      .filter((file) => file.endsWith('.md'))
      .sort()
    for (const file of files) {
      const raw = await readFile(join(CONTENT_DIR, section, file), 'utf-8')
      const { meta, body } = parseContent(raw)
      const title = raw.match(/^#\s+(.+)$/m)?.[1].trim()
      if (!title || !body || !meta['meta description']) {
        throw new Error(`Incomplete content: ${section}/${file}`)
      }
      collections[section].push({
        ...contentAddress(section, file, meta.slug),
        title,
        metaTitle: meta['meta title'] || title,
        description: meta['meta description'],
        sourceSlug: meta.slug,
        keywords: meta['target keywords'],
        date: meta.date,
        html: await renderHtml(body),
        body,
        file,
      })
    }
    validateContentAddresses(collections[section])
  }
  return collections
}

export async function getContent(section: ContentSection): Promise<ContentPost[]> {
  // Share one complete load across concurrent requests; never expose a partial
  // collection. A failed load may be retried on the next request.
  pending ??= load().catch((error) => {
    pending = undefined
    throw error
  })
  return (await pending)[section]
}

export async function getPost(
  section: ContentSection,
  slug: string,
): Promise<ContentPost | undefined> {
  const route = `/${section}/${slug}`
  return (await getContent(section)).find(
    (post) => post.route === route || post.aliases.includes(route),
  )
}
