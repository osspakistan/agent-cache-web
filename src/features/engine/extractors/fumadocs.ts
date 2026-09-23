/**
 * Fumadocs extractor
 *
 * Fumadocs (https://fumadocs.vercel.app) embeds the full page tree in its
 * Next.js App Router RSC streaming payload as `pageTreesByVersion` or
 * `pageTree`. Both are JSON objects inside `self.__next_f.push` script blocks.
 *
 * Tree shape (Fumadocs internal):
 *   { type: 'root', children: [ FolderNode | PageNode | SeparatorNode ] }
 *   FolderNode  = { type: 'folder', name: string, index?: { url: string }, children: [...] }
 *   PageNode    = { type: 'page',   name: string, url: string }
 *   SeparatorNode = { type: 'separator', name: string }
 *
 * We map this directly to NavHierarchy:
 *   - root-level FolderNodes       -> NavSection (title = folder.name)
 *   - root-level PageNodes         -> NavSection("Get Started") -> NavItem
 *   - SeparatorNodes inside Folder -> NavItem with .items (subgroup)
 *   - nested FolderNodes           -> NavItem with .items (subgroup)
 *   - PageNodes                    -> NavItem (leaf)
 */

import type { NavHierarchy, NavItem, NavSection } from '../../../lib/utils/types'
import type { DocExtractor } from './types'

// ---------------------------------------------------------------------------
// RSC payload extraction helpers
// ---------------------------------------------------------------------------

function decodeNextFChunks(html: string): string {
  const parts: string[] = []
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,\s*("(?:[^"\\]|\\.)*")\s*\]\)/g)) {
    try {
      parts.push(JSON.parse(m[1]) as string)
    } catch {}
  }
  return parts.join('')
}

function extractJsonAfterKey(text: string, key: string): string | null {
  const idx = text.indexOf(key)
  if (idx === -1) return null

  let pos = idx + key.length
  while (pos < text.length && text[pos] !== '{') pos++
  if (pos >= text.length) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = pos; i < text.length; i++) {
    const ch = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (!inString) {
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) return text.slice(pos, i + 1)
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Fumadocs tree -> NavHierarchy conversion
// ---------------------------------------------------------------------------

interface FdNode {
  type?: 'root' | 'folder' | 'page' | 'separator'
  $id?: string
  name?: string
  url?: string
  index?: { url?: string }
  children?: FdNode[]
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function processNodes(nodes: FdNode[], origin: string): NavItem[] {
  const items: NavItem[] = []
  let order = 1
  let currentGroup: (NavItem & { items: NavItem[] }) | null = null

  for (const node of nodes) {
    if (node.type === 'separator') {
      if (node.name) {
        currentGroup = {
          title: node.name,
          slug: toSlug(node.name),
          order: order++,
          items: [],
          url: '',
        }
        items.push(currentGroup)
      } else {
        currentGroup = null
      }
    } else if (node.type === 'page' && node.url && node.name) {
      const fullUrl = node.url.startsWith('http') ? node.url : `${origin}${node.url}`
      const item: NavItem = {
        title: node.name,
        url: fullUrl,
        slug: toSlug(node.name),
        order: order++,
      }
      if (currentGroup) {
        if (!currentGroup.url) currentGroup.url = fullUrl
        currentGroup.items.push(item)
      } else {
        items.push(item)
      }
    } else if (node.type === 'folder' && node.name && node.children?.length) {
      const subItems = processNodes(node.children, origin)
      if (subItems.length > 0) {
        const folderUrl = node.index?.url
          ? node.index.url.startsWith('http')
            ? node.index.url
            : `${origin}${node.index.url}`
          : subItems[0].url
        const folderItem: NavItem = {
          title: node.name,
          url: folderUrl,
          slug: toSlug(node.name),
          order: order++,
          items: subItems,
        }
        if (currentGroup) {
          if (!currentGroup.url) currentGroup.url = folderUrl
          currentGroup.items.push(folderItem)
        } else {
          items.push(folderItem)
        }
      }
    }
  }
  return items
}

function buildHierarchyFromRoot(
  root: FdNode,
  origin: string,
  docsUrl: string,
): NavHierarchy | null {
  const children = root.children ?? []
  if (children.length === 0) return null

  const sections: NavSection[] = []
  let sIdx = 1

  // Collect root-level pages (before any folder) into an implicit "Overview" or "Get Started" section
  const rootPages: NavItem[] = []
  let rootPageOrder = 1

  for (const node of children) {
    if (node.type === 'page' && node.url && node.name) {
      const fullUrl = node.url.startsWith('http') ? node.url : `${origin}${node.url}`
      rootPages.push({
        title: node.name,
        url: fullUrl,
        slug: toSlug(node.name),
        order: rootPageOrder++,
      })
    } else if (node.type === 'folder' && node.name && node.children?.length) {
      const items = processNodes(node.children, origin)
      if (items.length > 0) {
        sections.push({
          title: node.name,
          slug: toSlug(node.name),
          order: sIdx++,
          items,
        })
      }
    }
  }

  // Prepend root pages as first section
  if (rootPages.length > 0) {
    const rootSectionName = root.name || 'Get Started'
    sections.unshift({
      title: rootSectionName,
      slug: toSlug(rootSectionName),
      order: 0,
      items: rootPages,
    })
    sections.forEach((s, i) => {
      s.order = i + 1
    })
  }

  if (sections.length === 0) return null

  return {
    title: new URL(docsUrl).hostname,
    sections,
  }
}

// ---------------------------------------------------------------------------
// Extractor implementation
// ---------------------------------------------------------------------------

function parseFumadocsTree(html: string, docsUrl: string): NavHierarchy | null {
  const origin = new URL(docsUrl).origin

  // Step 1: Reconstruct RSC payload from self.__next_f chunks
  const rsc = decodeNextFChunks(html)
  const searchBase = rsc.length > 0 ? rsc : html

  // Step 2: Try pageTreesByVersion.latest first (versioned Fumadocs sites)
  const byVersionRaw = extractJsonAfterKey(searchBase, '"pageTreesByVersion":')
  if (byVersionRaw) {
    try {
      const sanitized = byVersionRaw.replace(/:\s*\$undefined/g, ': null')
      const parsed = JSON.parse(sanitized) as Record<string, FdNode>
      const root = parsed.latest ?? Object.values(parsed)[0]
      if (root?.type === 'root' || root?.$id) {
        const hier = buildHierarchyFromRoot(root, origin, docsUrl)
        if (hier && hier.sections.length > 0) return hier
      }
    } catch {}
  }

  // Step 3: Try pageTree (non-versioned) or "tree" (Geistdocs/Fumadocs variant)
  for (const treeKey of ['"pageTree":', '"tree":']) {
    const treeRaw = extractJsonAfterKey(searchBase, treeKey)
    if (treeRaw) {
      try {
        const sanitized = treeRaw.replace(/:\s*\$undefined/g, ': null')
        const root = JSON.parse(sanitized) as FdNode
        if (root?.type === 'root' || root?.$id) {
          const hier = buildHierarchyFromRoot(root, origin, docsUrl)
          if (hier && hier.sections.length > 0) return hier
        }
      } catch {}
    }
  }

  // Step 4: Fallback - try parsing doubly-escaped JSON (from raw html without RSC decode)
  for (const key of ['"pageTreesByVersion":', '"pageTree":', '"tree":']) {
    const escapedKey = key.replace(/"/g, '\\"')
    const idx = html.indexOf(escapedKey)
    if (idx !== -1) {
      const chunk = html.slice(idx, idx + 150000)
      const unescaped = chunk.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      const raw = extractJsonAfterKey(unescaped, key)
      if (raw) {
        try {
          const sanitized = raw.replace(/:\s*\$undefined/g, ': null')
          if (key.includes('sByVersion')) {
            const parsed = JSON.parse(sanitized) as Record<string, FdNode>
            const root = parsed.latest ?? Object.values(parsed)[0]
            if (root?.type === 'root' || root?.$id) {
              const hier = buildHierarchyFromRoot(root, origin, docsUrl)
              if (hier && hier.sections.length > 0) return hier
            }
          } else {
            const root = JSON.parse(sanitized) as FdNode
            if (root?.type === 'root' || root?.$id) {
              const hier = buildHierarchyFromRoot(root, origin, docsUrl)
              if (hier && hier.sections.length > 0) return hier
            }
          }
        } catch {}
      }
    }
  }

  return null
}

export const fumadocsExtractor: DocExtractor = {
  name: 'fumadocs',

  detect(html: string): boolean {
    return (
      html.includes('pageTreesByVersion') ||
      html.includes('"pageTree"') ||
      html.includes('"tree":') ||
      html.includes('fd-sidebar') ||
      html.includes('data-geistdocs-container')
    )
  },

  async extract(url: string, html: string): Promise<NavHierarchy | null> {
    try {
      return parseFumadocsTree(html, url)
    } catch {
      return null
    }
  },
}
