// Content registry - reads content/{blog,compare}/*.md, parses the bold-meta
// frontmatter convention, and renders bodies via @comark/html.
//
// Content format (developer-first, no YAML):
//   # Title
//
//   **meta title:** ...
//   **meta description:** ...
//   **slug:** /blog/my-post
//   **target keywords:** ...
//
//   ---
//   body markdown...
//
// The route slug is derived from the FILENAME (not the **slug:** line, which is
// only kept as reference). This gives us predictable URLs: /blog/<base>,
// /compare/<base>. Filenames are already cleaned (numeric prefixes stripped,
// comparison names normalized).
//
// Everything is parsed once at startup and cached. Content is a static part of
// the bundle - it does not change at runtime.

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { renderHtml } from '@comark/html'

export type ContentSection = 'blog' | 'compare'

export interface ContentPost {
  /** url-path-safe slug, e.g. '100-sites-extracted' */
  slug: string
  /** absolute route, e.g. '/blog/100-sites-extracted' */
  route: string
  /** markdown h1 (first heading) - used as the display title */
  title: string
  /** meta title for SEO <title> */
  metaTitle: string
  /** meta description / excerpt */
  description: string
  /** from the **slug:** reference line, informational only */
  sourceSlug?: string
  /** from the **target keywords:** line */
  keywords?: string
  /** rendered HTML body (the content after the --- marker) */
  html: string
  /** raw markdown body (with meta block stripped) */
  body: string
  /** original filename */
  file: string
}

interface ParseResult {
  meta: Record<string, string>
  body: string
}

const CACHE: Record<ContentSection, ContentPost[]> = { blog: [], compare: [] }

const CONTENT_DIR = join(process.cwd(), 'content')

/** Parse the bold-meta frontmatter block and split off the body. */
export function parseContent(raw: string): ParseResult {
  // Split on the first line that is exactly '---'.
  const sepIdx = raw.indexOf('\n---\n')
  const header = sepIdx === -1 ? raw : raw.slice(0, sepIdx)
  const body = sepIdx === -1 ? '' : raw.slice(sepIdx + 4).trim()

  const meta: Record<string, string> = {}
  // Bold-meta convention is **key:** value — the colon is INSIDE the bold
  // markers (**meta title:** ...), so the close comes after the colon.
  for (const line of header.split('\n')) {
    const m = line.match(/^\*\*(.+?):\*\*\s*(.*)$/)
    if (m) meta[m[1].trim()] = m[2].trim()
  }

  return { meta, body }
}

/** Extract the first markdown H1 from the header (title is on its own line
 *  before the meta block). Falls back to the first line of the body. */
function extractTitle(header: string, body: string): string {
  const m = header.match(/^#{1,2}\s+(.+)$/m)
  if (m) return m[1].trim()
  const b = body.match(/^#{1,2}\s+(.+)$/m)
  if (b) return b[1].trim()
  return (header.split('\n')[0] || body.split('\n')[0] || 'Untitled').trim()
}

function slugFromFile(file: string): string {
  return file.replace(/\.md$/, '')
}

async function load(): Promise<void> {
  if (CACHE.blog.length > 0 || CACHE.compare.length > 0) return

  for (const section of ['blog', 'compare'] as ContentSection[]) {
    let files: string[] = []
    try {
      files = (await readdir(join(CONTENT_DIR, section))).filter((f) => f.endsWith('.md')).sort()
    } catch {
      files = [] // content dir missing - no posts
    }

    const posts: ContentPost[] = []
    for (const file of files) {
      const raw = await readFile(join(CONTENT_DIR, section, file), 'utf-8')
      const { meta, body } = parseContent(raw)
      const slug = slugFromFile(file)
      const title = extractTitle(raw.split('\n---\n')[0] ?? '', body)
      posts.push({
        slug,
        route: `/${section}/${slug}`,
        title,
        metaTitle: meta['meta title'] ?? title,
        description: meta['meta description'] ?? '',
        sourceSlug: meta.slug,
        keywords: meta['target keywords'],
        html: await renderHtml(body),
        body,
        file,
      })
    }
    CACHE[section] = posts
  }
}

export async function getContent(section: ContentSection): Promise<ContentPost[]> {
  await load()
  return CACHE[section]
}

export async function getPost(
  section: ContentSection,
  slug: string,
): Promise<ContentPost | undefined> {
  const posts = await getContent(section)
  return posts.find((p) => p.slug === slug)
}
