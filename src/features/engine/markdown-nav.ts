// Markdown-nav fallback: when DOM sidebar extractors produce flat garbage or
// nothing at all, convert the page to markdown (turndown, deterministic, no
// LLM) and parse the navigation out of the nested list structure.
//
// Why this works: turndown normalizes the wild variety of sidebar DOM into
// predictable text patterns:
//   -   [Page](/docs/x)      -> page item
//   -   **Group Label**      -> group label (bold, no link, e.g. <strong>)
//   -   Plain Label          -> group label (text, no link)
//   indentation              -> nesting depth
// Group labels that DOM selectors miss (<strong>, <span>, bare text) all
// survive as plain markdown text.

import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'
import type { NavHierarchy, NavItem, NavSection } from '../../lib/utils/types'

const LIST_RX = /^(\s*)[-*+]\s+(.*)$/
const LINK_RX = /^\[([^\]]+)\]\(([^)\s]+)[^)]*\)/
const BOLD_RX = /^\*\*([^*]+)\*\*$/

interface MdNode {
  label: string
  href: string | null
  children: MdNode[]
}

/** Convert raw HTML to markdown with scripts/styles stripped. */
function htmlToMarkdown(html: string): string {
  const dom = new JSDOM(html)
  const doc = dom.window.document
  doc.querySelectorAll('script, style, noscript, svg, template').forEach((el) => {
    el.remove()
  })
  const body = doc.body
  if (!body) return ''
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
  return td.turndown(body.innerHTML)
}

/** Parse the largest in-scope nested list in a markdown document into a tree. */
export function parseMarkdownNav(
  markdown: string,
  baseDocsUrl: string,
  isWithinScope: (url: string) => boolean,
): MdNode[] {
  const lines = markdown.split('\n')

  // collect list items with their indent depth
  const items: Array<{ depth: number; label: string; href: string | null }> = []
  let minIndent = Number.POSITIVE_INFINITY
  const raw: Array<{ indent: number; text: string }> = []
  for (const line of lines) {
    const m = line.match(LIST_RX)
    if (!m) continue
    const indent = m[1].length
    if (indent > 0) minIndent = Math.min(minIndent, indent)
    raw.push({ indent, text: m[2].trim() })
  }
  const unit = Number.isFinite(minIndent) && minIndent > 0 ? minIndent : 2

  for (const { indent, text } of raw) {
    const depth = Math.round(indent / unit)
    const link = text.match(LINK_RX)
    if (link) {
      items.push({ depth, label: link[1].replace(/\s+/g, ' ').trim(), href: link[2] })
      continue
    }
    const bold = text.match(BOLD_RX)
    if (bold) {
      items.push({ depth, label: bold[1].replace(/\s+/g, ' ').trim(), href: null })
      continue
    }
    // plain text with no link and no bold: group label candidate, but drop
    // anything that looks like stray prose (contains sentence punctuation)
    const plain = text.replace(/\*\*/g, '').trim()
    if (plain && !/[.!?:;]$/.test(plain) && plain.length <= 60) {
      items.push({ depth, label: plain, href: null })
    }
  }

  // build tree via stack
  const root: MdNode = { label: '', href: null, children: [] }
  const stack: Array<{ depth: number; node: MdNode }> = [{ depth: -1, node: root }]
  for (const item of items) {
    let url: string | null = null
    if (item.href) {
      try {
        const abs = new URL(item.href, baseDocsUrl)
        abs.hash = '' // drop #anchors - toc links must not become pages
        if (isWithinScope(abs.href)) url = abs.href.replace(/\/$/, '')
      } catch {}
    }
    const node: MdNode = { label: item.label, href: url, children: [] }
    while (stack.length > 1 && stack[stack.length - 1].depth >= item.depth) stack.pop()
    stack[stack.length - 1].node.children.push(node)
    stack.push({ depth: item.depth, node })
  }

  // prune: drop linkless nodes that carry no in-scope descendants
  const prune = (node: MdNode): boolean => {
    node.children = node.children.filter((c) => prune(c))
    return Boolean(node.href) || node.children.length > 0
  }
  root.children = root.children.filter((c) => prune(c))
  return root.children
}

/** Map the markdown tree onto NavHierarchy (groups -> sections, nesting kept). */
function toHierarchy(top: MdNode[], title: string): NavHierarchy {
  const seen = new Set<string>()
  const sections: NavSection[] = []
  let sIdx = 1

  const toNavItem = (node: MdNode): NavItem => {
    const item: NavItem = { title: node.label, order: 0 }
    if (node.href) {
      item.url = node.href
      item.slug = node.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    }
    const kids = node.children.filter((c) => !c.href || !seen.has(c.href))
    for (const c of kids) if (c.href) seen.add(c.href)
    const mapped = kids.map(toNavItem)
    if (mapped.length > 0) item.items = mapped
    return item
  }

  for (const top1 of top) {
    if (top1.href && top1.children.length === 0) {
      // loose top-level page -> its own single-item section
      if (seen.has(top1.href)) continue
      seen.add(top1.href)
      sections.push({
        title: top1.label,
        slug: top1.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        order: sIdx++,
        items: [{ title: top1.label, url: top1.href, order: 1 }],
      })
      continue
    }
    // group (label-only, or label-with-landing-page) -> section with children
    const kids = top1.children.filter((c) => !c.href || !seen.has(c.href))
    const items: NavItem[] = []
    if (top1.href && !seen.has(top1.href)) {
      seen.add(top1.href)
      items.push({
        title: top1.label,
        url: top1.href,
        order: items.length + 1,
        slug: top1.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      })
    }
    for (const c of kids) {
      if (c.href) seen.add(c.href)
      const navItem = toNavItem(c)
      navItem.order = items.length + 1
      items.push(navItem)
    }
    if (items.length === 0) continue
    sections.push({
      title: top1.label,
      slug: top1.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      order: sIdx++,
      items,
    })
  }

  return { title, sections }
}

/** Quality score: rewards multi-item and nested sections, punishes flat trees
 *  where every section holds exactly one item (the mis-grouping signature). */
export function scoreHierarchy(h: NavHierarchy): number {
  let score = 0
  let allSingle = h.sections.length > 0
  for (const sec of h.sections) {
    const count = (items: NavItem[]): number =>
      items.reduce((acc, it) => acc + 1 + count(it.items ?? []), 0)
    const n = count(sec.items)
    const nested = sec.items.some((it) => (it.items?.length ?? 0) > 0)
    if (sec.items.length > 1 || nested) {
      score += 3 * n
      allSingle = false
    } else {
      score += 1
    }
  }
  if (allSingle && h.sections.length >= 4) score *= 0.25
  return score
}

/** Build the markdown-nav hierarchy from raw HTML, or null if too weak. */
export function buildMarkdownNavHierarchy(
  html: string,
  baseDocsUrl: string,
  isWithinScope: (url: string) => boolean,
): NavHierarchy | null {
  const md = htmlToMarkdown(html)
  if (!md) return null
  const top = parseMarkdownNav(md, baseDocsUrl, isWithinScope)
  if (top.length < 2) return null
  const tree = toHierarchy(top, new URL(baseDocsUrl).hostname)
  const totalItems = tree.sections.reduce(
    (acc, s) => acc + s.items.reduce((a, it) => a + 1 + (it.items?.length ?? 0), 0),
    0,
  )
  if (tree.sections.length < 2 || totalItems < 3) return null
  return tree
}

export interface TreePick {
  tree: NavHierarchy
  source: string
}

/** Compare a DOM-extractor tree against the markdown-nav tree; keep the
 *  better-structured one. Ties go to the DOM extractor (framework-specific
 *  selectors are more precise when they actually work). */
export function pickBetterTree(
  domTree: NavHierarchy,
  domSource: string,
  mdTree: NavHierarchy | null,
): TreePick {
  if (!mdTree) return { tree: domTree, source: domSource }
  const domScore = scoreHierarchy(domTree)
  const mdScore = scoreHierarchy(mdTree)
  if (mdScore > domScore)
    return { tree: mdTree, source: `markdown-nav (dom ${domSource} scored flat)` }
  return { tree: domTree, source: domSource }
}
