import { spawn } from 'node:child_process'
import { JSDOM } from 'jsdom'
import type { NavHierarchy, NavItem, NavSection, StreamEvent } from '../../lib/utils/types'

const NON_DOCS_FILTER =
  /(?:^|\/)(?:blog|changelog|news|pricing|legal|careers|jobs|podcast|contact|privacy|terms|cookie|press|status|login|signup|marketplace|store|assets?)(?:\/|$)|_next|_astro|_nuxt|cdn-cgi|_static\/js\/|\$\{|%7B|\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|eot|json|map|zip|tar|gz)(\?.*)?$/i

const COMMON_DOCS_SUBDOMAINS = [
  'docs',
  'doc',
  'developer',
  'developers',
  'api',
  'apis',
  'help',
  'guide',
  'guides',
  'learn',
  'reference',
  'manual',
]

interface DiscoveredPage {
  title: string
  url: string
  sectionName?: string
}

export type TopologyProgressCallback = (event: StreamEvent) => Promise<void>

export interface TopologyOptions {
  llmsTxtUrl?: string
  onProgress?: TopologyProgressCallback
}

interface MintlifyPage {
  title?: string
  href?: string
  group?: string
  pages?: MintlifyPage[]
}

interface MintlifyGroup {
  group?: string
  pages?: (MintlifyPage | string)[]
}

interface MintlifyTab {
  tab?: string
  groups?: MintlifyGroup[]
}

interface MintlifyNav {
  tabs?: MintlifyTab[]
}

// Helper to extract Mintlify embedded navigation tree (handles multi-tab sites like docs.context.dev)
function parseScopedNavFromHtml(html: string): MintlifyNav | null {
  const key = '{\\"scopedNav\\":'
  const idx = html.indexOf(key)
  if (idx === -1) return null
  let depth = 0
  let inString = false
  let end = -1
  for (let i = idx; i < html.length; i++) {
    const ch = html[i]
    const prev = html[i - 1]
    if (ch === '"' && prev === '\\') {
      let b = i - 1
      let count = 0
      while (b >= 0 && html[b] === '\\') {
        count++
        b--
      }
      if (count % 2 === 1) inString = !inString
    }
    if (!inString) {
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          end = i + 1
          break
        }
      }
    }
  }
  if (end === -1) return null
  try {
    const rawSnippet = html.slice(idx, end)
    const cleanJson = rawSnippet.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    return JSON.parse(cleanJson)?.scopedNav as MintlifyNav
  } catch {
    return null
  }
}

async function extractMintlifyHierarchy(
  docsUrl: string,
  initialHtml: string,
): Promise<NavHierarchy | null> {
  const url = new URL(docsUrl)
  const origin = url.origin
  const initialNav = parseScopedNavFromHtml(initialHtml)
  if (!initialNav?.tabs) return null

  const sections: NavSection[] = []
  const processedTabs = new Set<string>()
  let sIdx = 1

  async function processNav(nav: MintlifyNav) {
    for (const tab of nav.tabs || []) {
      if (!tab.tab || processedTabs.has(tab.tab)) continue
      if (!tab.groups || tab.groups.length === 0) continue
      processedTabs.add(tab.tab)

      for (const grp of tab.groups) {
        const grpTitle = grp.group || tab.tab || 'General'
        const items: NavItem[] = []
        let iIdx = 1

        const addPage = (p: MintlifyPage | string | undefined) => {
          if (!p) return
          if (typeof p === 'object' && p.group && p.pages) {
            for (const sub of p.pages) addPage(sub)
            return
          }
          const href = typeof p === 'string' ? p : p.href || ''
          const title =
            (typeof p === 'object' ? p.title : undefined) ||
            (href.split('/').pop() || 'Untitled').replace(/[-_]+/g, ' ')
          if (href) {
            let fullUrl: string
            try {
              if (href.startsWith('http://') || href.startsWith('https://')) {
                fullUrl = href
              } else {
                // If docsUrl has a subpath prefix (e.g. /docs or /docs/), preserve it
                const docsObj = new URL(docsUrl)
                const basePath = docsObj.pathname.replace(/\/$/, '')
                let cleanHref = href.startsWith('/') ? href.slice(1) : href
                if (basePath && !cleanHref.startsWith(basePath.replace(/^\//, ''))) {
                  cleanHref = `${basePath.replace(/^\//, '')}/${cleanHref}`
                }
                fullUrl = new URL(cleanHref, docsObj.origin).href
              }
            } catch {
              fullUrl = new URL(href, docsUrl).href
            }

            if (!items.some((it) => it.url === fullUrl)) {
              items.push({
                title,
                url: fullUrl,
                order: iIdx++,
              })
            }
          }
        }

        for (const p of grp.pages || []) addPage(p)

        if (items.length > 0) {
          sections.push({
            title: grpTitle,
            slug: grpTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            tab: tab.tab,
            order: sIdx++,
            items,
          })
        }
      }
    }
  }

  await processNav(initialNav)

  // Probe remaining tabs (e.g. "API Reference" on docs.context.dev or scoped docs)
  const basePath = url.pathname.replace(/\/$/, '')
  for (const tab of initialNav.tabs || []) {
    if (tab.tab && !processedTabs.has(tab.tab)) {
      const tabName = tab.tab
      const tabSlug = tabName.toLowerCase().replace(/\s+/g, '-')
      const candidateUrls = [`${origin}/${tabSlug}`, `${origin}/api-reference`, `${origin}/docs`]
      if (basePath && basePath !== '') {
        candidateUrls.unshift(`${origin}${basePath}/${tabSlug}`)
        candidateUrls.push(`${origin}${basePath}/api-reference`)
      }
      for (const cand of candidateUrls) {
        try {
          const res = await fetch(cand, { headers: { 'User-Agent': 'agent-cache/1.0' } })
          if (res.ok) {
            const candHtml = await res.text()
            const candNav = parseScopedNavFromHtml(candHtml)
            if (candNav) {
              await processNav(candNav)
              if (processedTabs.has(tabName)) break
            }
          }
        } catch {}
      }
    }
  }

  if (sections.length > 0) {
    const tabs = Array.from(
      new Set(sections.map((s) => s.tab).filter((t): t is string => Boolean(t))),
    )
    return {
      title: url.hostname,
      tabs: tabs.length > 0 ? tabs : undefined,
      sections,
    }
  }
  return null
}

interface StripeNavChild {
  type: string
  text?: string
  href?: string
  children?: StripeNavChild[]
}

interface StripeProduct {
  type: string
  text?: string
  href?: string
  topic?: { text: string; href: string }
  children?: StripeNavChild[]
}

interface StripeState {
  navigation?: {
    topics?: { text: string; href: string }[]
    products?: StripeProduct[]
  }
}

function extractInitialStateJson(html: string): StripeState | null {
  const key = 'window.__INITIAL_STATE__ = {'
  const start = html.indexOf(key)
  if (start === -1) return null
  const jsonStart = start + 'window.__INITIAL_STATE__ = '.length
  let depth = 0
  let inString = false
  let isEscaped = false
  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i]
    if (isEscaped) {
      isEscaped = false
      continue
    }
    if (ch === '\\') {
      isEscaped = true
      continue
    }
    if (ch === '"' && !isEscaped) {
      inString = !inString
      continue
    }
    if (!inString) {
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(jsonStart, i + 1))
          } catch {
            return null
          }
        }
      }
    }
  }
  return null
}

function extractStripeHierarchy(docsUrl: string, html: string): NavHierarchy | null {
  const state = extractInitialStateJson(html)
  if (!state?.navigation?.products || !Array.isArray(state.navigation.products)) {
    return null
  }

  const url = new URL(docsUrl)
  const targetHost = url.hostname

  function parseChildren(children: StripeNavChild[], baseDocsUrl: string): NavItem[] {
    const items: NavItem[] = []
    let order = 1
    for (const c of children) {
      if (c.type === 'link' && c.href && c.text) {
        try {
          const fullUrl = new URL(c.href, baseDocsUrl).href
          const candHost = new URL(fullUrl).hostname
          // STRICT same-host filtering: ignore external sites like stripe.dev, support.stripe.com
          if (candHost === targetHost) {
            const subItems =
              c.children && c.children.length > 0
                ? parseChildren(c.children, baseDocsUrl)
                : undefined
            items.push({
              title: c.text,
              url: fullUrl,
              order: order++,
              slug: c.text.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              ...(subItems && subItems.length > 0 ? { items: subItems } : {}),
            })
          }
        } catch {}
      } else if (c.type === 'heading' && c.children && c.children.length > 0) {
        const subItems = parseChildren(c.children, baseDocsUrl)
        if (subItems.length > 0) {
          items.push(...subItems)
        }
      }
    }
    return items
  }

  // Determine current active topic if visiting a sub-topic directly (e.g. /get-started or /payments)
  const pathname = url.pathname.replace(/\/$/, '')
  let activeTopicName: string | undefined
  if (state.navigation.topics && Array.isArray(state.navigation.topics)) {
    const matched = state.navigation.topics.find((t) => t.href === pathname)
    if (matched) activeTopicName = matched.text
  }

  // Filter products: if user targeted a specific pillar (like /get-started), scope to that pillar
  // Otherwise include all primary pillar sections
  const products: StripeProduct[] = state.navigation.products.filter((p: StripeProduct) => {
    if (!p.text || !p.children || p.children.length === 0) return false
    if (activeTopicName) {
      return p.topic?.text === activeTopicName
    }
    // For root docs hub, include Get started and primary core pillars
    return Boolean(p.topic?.text)
  })

  const sections: NavSection[] = []
  let sIdx = 1

  for (const p of products) {
    const items = parseChildren(p.children || [], docsUrl)
    if (items.length > 0) {
      sections.push({
        title: p.text || 'Overview',
        slug: (p.text || 'overview').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        tab: p.topic?.text || 'Docs',
        order: sIdx++,
        items,
      })
    }
  }

  if (sections.length >= 2) {
    const tabs = Array.from(
      new Set(sections.map((s) => s.tab).filter((t): t is string => Boolean(t))),
    )
    return {
      title: 'Stripe Documentation',
      tabs: tabs.length > 1 ? tabs : undefined,
      sections,
    }
  }

  return null
}

function extractMdBookHierarchy(
  doc: Document,
  baseDocsUrl: string,
  isWithinScope: (url: string) => boolean,
): NavHierarchy | null {
  const chapterOl = doc.querySelector(
    'nav.sidebar ol.chapter, .sidebar-scrollbox ol.chapter, ol.chapter',
  )
  if (!chapterOl) return null

  const bookTitle =
    doc.querySelector('.menu-title')?.textContent?.trim() ||
    doc.querySelector('h1')?.textContent?.trim() ||
    'Documentation'

  const sections: NavSection[] = []
  let currentSectionTitle = bookTitle
  let currentItems: NavItem[] = []
  let sIdx = 1

  for (const child of Array.from(chapterOl.children)) {
    if (child.classList.contains('part-title')) {
      if (currentItems.length > 0) {
        sections.push({
          title: currentSectionTitle,
          slug: currentSectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          order: sIdx++,
          items: currentItems,
        })
      }
      currentSectionTitle = child.textContent?.trim() || bookTitle
      currentItems = []
    } else {
      const links = Array.from(child.querySelectorAll('a[href]'))
      for (const a of links) {
        const href = a.getAttribute('href')
        const title = a.textContent?.trim()
        if (!href || !title || href.startsWith('#') || href.startsWith('javascript:')) continue

        try {
          const fullUrl = new URL(href, baseDocsUrl).href
          if (isWithinScope(fullUrl)) {
            if (!currentItems.some((it) => it.url === fullUrl)) {
              currentItems.push({
                title,
                url: fullUrl,
                order: currentItems.length + 1,
              })
            }
          }
        } catch {}
      }
    }
  }

  if (currentItems.length > 0) {
    sections.push({
      title: currentSectionTitle,
      slug: currentSectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      order: sIdx++,
      items: currentItems,
    })
  }

  const totalItemCount = sections.reduce((acc, s) => acc + s.items.length, 0)
  if (sections.length >= 1 && totalItemCount >= 2) {
    return {
      title: new URL(baseDocsUrl).hostname,
      sections,
    }
  }
  return null
}

function extractPrimerHierarchy(
  doc: Document,
  baseDocsUrl: string,
  isWithinScope: (url: string) => boolean,
): NavHierarchy | null {
  const nav = doc.querySelector(
    'nav[aria-label="Site"], nav[aria-label*="navigation" i], .sidebar-module--Box--4180a',
  )
  if (!nav) return null

  const mainUl = nav.querySelector('ul')
  if (!mainUl) return null

  const topGroups = Array.from(mainUl.children).filter(
    (c) => c.tagName === 'LI' && (c.className.includes('Group') || Boolean(c.querySelector('ul'))),
  )
  if (topGroups.length < 2) return null

  function parseLi(li: Element): NavItem | null {
    const labelSpan =
      li.querySelector(':scope > button [data-component="ActionList.Item.Label"]') ||
      li.querySelector(':scope > a [data-component="ActionList.Item.Label"]') ||
      li.querySelector(':scope > div > a [data-component="ActionList.Item.Label"]') ||
      li.querySelector(':scope > a') ||
      li.querySelector(':scope > button')

    const title = (labelSpan?.textContent || '').trim().replace(/\s+/g, ' ')
    const directAnchor = li.querySelector(':scope > a, :scope > div > a')
    const href = directAnchor?.getAttribute('href')
    let url: string | undefined

    if (href && !href.startsWith('#') && !href.includes('github.com')) {
      try {
        const full = new URL(href, baseDocsUrl).href
        if (isWithinScope(full)) url = full
      } catch {}
    }

    const subUl = li.querySelector(':scope > ul, :scope > div > ul, :scope > [id] > ul')
    if (subUl) {
      const childLis = Array.from(subUl.children).filter(
        (c) => c.tagName === 'LI' && !c.className.includes('Divider'),
      )
      const children = childLis.map(parseLi).filter((it): it is NavItem => Boolean(it))
      return {
        title: title || (children[0]?.title ?? 'Section'),
        url: url || children[0]?.url || baseDocsUrl,
        items: children,
      }
    }

    if (url && title) {
      return { title, url }
    }
    return null
  }

  const sections: NavSection[] = []
  let sIdx = 1

  for (const grp of topGroups) {
    const grpList = grp.querySelector('ul')
    if (!grpList) continue

    const groupItems = Array.from(grpList.children)
      .filter((c) => c.tagName === 'LI')
      .map(parseLi)
      .filter((it): it is NavItem => Boolean(it))

    for (const item of groupItems) {
      const itemsList = item.items && item.items.length > 0 ? item.items : [item]
      sections.push({
        title: item.title,
        slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        order: sIdx++,
        items: itemsList,
      })
    }
  }

  if (sections.length >= 2) {
    return {
      title: new URL(baseDocsUrl).hostname,
      sections,
    }
  }
  return null
}

async function extractGroupedSidebarHierarchy(
  doc: Document,
  baseDocsUrl: string,
  isWithinScope: (url: string) => boolean,
): Promise<NavHierarchy | null> {
  // Modern docs (Cursor, Tailwind, Next, Radix, shadcn) wrap navigation groups in structured containers
  const groupContainers = Array.from(
    doc.querySelectorAll(
      'div.space-y-1, div[data-sidebar-group], div[class*="sidebar-group"], ul[class*="sidebar-group"], div[class*="nav-group"]',
    ),
  )

  // 1. Identify collapsed accordion buttons (e.g. Cursor "Models & Pricing", "Tools", "Enterprise")
  const collapsedButtons: { text: string; secTitle: string }[] = []
  const seenButtons = new Set<string>()
  for (const container of groupContainers) {
    const heading = container.querySelector('h2, h3, h4')
    const secTitle = heading ? heading.textContent?.trim() || '' : ''
    const buttons = Array.from(container.querySelectorAll('button')).filter((b) => {
      return !/theme|copy|search|menu|palette/i.test(b.textContent || '')
    })
    for (const b of buttons) {
      const text = b.textContent?.trim()
      if (!text || seenButtons.has(text)) continue
      seenButtons.add(text)
      collapsedButtons.push({ text, secTitle })
    }
  }

  // 2. Fetch expandable subpages in parallel to uncover nested accordions
  const additionalDocs: Document[] = []
  if (collapsedButtons.length > 0) {
    const probeResults = await Promise.all(
      collapsedButtons.map(async ({ text, secTitle }) => {
        const slug = text
          .toLowerCase()
          .replace(/&/g, 'and')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
        const secSlug = secTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const origin = new URL(baseDocsUrl).origin
        const candidates = [
          `${origin}/docs/${slug}`,
          `${origin}/docs/${secSlug}/${slug}`,
          `${origin}/docs/${secSlug}`,
          `${origin}/docs/agent/${slug}`,
          `${origin}/docs/agent/tools/browser`,
          `${origin}/docs/cloud-agents/${slug}`,
          `${origin}/docs/enterprise/${slug}`,
          `${origin}/docs/${slug.replace(/-and-.*$/, '')}`,
        ]
        for (const cand of candidates) {
          try {
            const res = await fetch(cand, {
              headers: { 'User-Agent': 'agent-cache/1.0' },
              signal: AbortSignal.timeout(3500),
            })
            if (res.ok) {
              const subHtml = await res.text()
              return new JSDOM(subHtml).window.document
            }
          } catch {}
        }
        return null
      }),
    )
    for (const d of probeResults) {
      if (d) additionalDocs.push(d)
    }
  }

  // 3. Aggregate all discovered sections and nested items across main doc and subdocs
  const allDocs = [doc, ...additionalDocs]

  type GroupEntry =
    | { type: 'item'; title: string; url: string }
    | { type: 'group'; title: string; subItems: Map<string, string> }

  const sectionEntries = new Map<string, GroupEntry[]>()

  for (const currentDoc of allDocs) {
    const containers = Array.from(
      currentDoc.querySelectorAll(
        'div.space-y-1, div[data-sidebar-group], div[class*="sidebar-group"], ul[class*="sidebar-group"], div[class*="nav-group"]',
      ),
    )
    for (const container of containers) {
      const heading = container.querySelector('h2, h3, h4, [class*="title"], [class*="header"]')
      if (!heading) continue
      const title = heading.textContent?.trim()
      if (!title || title.length > 50) continue
      if (/command palette|search|menu|on this page/i.test(title)) continue

      let secKey = title
      for (const existingKey of sectionEntries.keys()) {
        if (existingKey.toLowerCase() === title.toLowerCase()) {
          secKey = existingKey
          break
        }
      }

      let entries = sectionEntries.get(secKey)
      if (!entries) {
        entries = []
        sectionEntries.set(secKey, entries)
      }

      // Container's items wrapper
      const listContainer =
        container.querySelector('.space-y-0, div:has(> a), div:has(> button), ul') || container

      const children = Array.from(listContainer.children)
      for (let i = 0; i < children.length; i++) {
        const child = children[i]

        // Check if child is an accordion button
        const btn = child.tagName === 'BUTTON' ? child : child.querySelector(':scope > button')
        if (btn) {
          const btnText = btn.textContent?.trim()
          if (!btnText || /theme|copy|search|menu|palette/i.test(btnText)) continue

          let groupEntry = entries.find(
            (e): e is Extract<GroupEntry, { type: 'group' }> =>
              e.type === 'group' && e.title.toLowerCase() === btnText.toLowerCase(),
          )
          if (!groupEntry) {
            groupEntry = { type: 'group', title: btnText, subItems: new Map<string, string>() }
            entries.push(groupEntry)
          }

          // Check if next sibling is the expanded sub-items container
          const nextSib = children[i + 1]
          if (
            nextSib &&
            (nextSib.classList.contains('pl-4') ||
              nextSib.querySelector('a') ||
              nextSib.className.includes('space-y-0'))
          ) {
            const subLinks = Array.from(nextSib.querySelectorAll('a[href]'))
            for (const a of subLinks) {
              const href = a.getAttribute('href')
              const itemTitle = a.textContent?.trim()
              if (!href || !itemTitle || href.startsWith('#') || href.startsWith('javascript:'))
                continue
              try {
                const full = new URL(href, baseDocsUrl).href
                if (isWithinScope(full) && !groupEntry.subItems.has(full)) {
                  groupEntry.subItems.set(full, itemTitle)
                }
              } catch {}
            }
          }
          continue
        }

        // Otherwise direct link
        const a = child.tagName === 'A' ? child : child.querySelector('a[href]')
        if (a) {
          const href = a.getAttribute('href')
          const itemTitle = a.textContent?.trim()
          if (!href || !itemTitle || href.startsWith('#') || href.startsWith('javascript:'))
            continue
          try {
            const full = new URL(href, baseDocsUrl).href
            if (isWithinScope(full)) {
              const alreadyExists = entries.some(
                (e) =>
                  (e.type === 'item' && e.url === full) ||
                  (e.type === 'group' && e.subItems.has(full)),
              )
              if (!alreadyExists) {
                entries.push({ type: 'item', title: itemTitle, url: full })
              }
            }
          } catch {}
        }
      }
    }
  }

  const sections: NavSection[] = []
  let sIdx = 1

  for (const [title, entries] of sectionEntries.entries()) {
    const items: NavItem[] = []
    let iIdx = 1

    for (const entry of entries) {
      if (entry.type === 'item') {
        items.push({
          title: entry.title,
          url: entry.url,
          order: iIdx++,
          slug: entry.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        })
      } else if (entry.type === 'group') {
        const subList: NavItem[] = []
        let subIdx = 1
        for (const [url, subTitle] of entry.subItems.entries()) {
          subList.push({
            title: subTitle,
            url,
            order: subIdx++,
            slug: subTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          })
        }

        if (subList.length > 0) {
          items.push({
            title: entry.title,
            url: subList[0].url,
            order: iIdx++,
            slug: entry.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            items: subList,
          })
        }
      }
    }

    if (items.length >= 1) {
      sections.push({
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        order: sIdx++,
        items,
      })
    }
  }

  if (sections.length >= 2) {
    return {
      title: new URL(baseDocsUrl).hostname,
      sections,
    }
  }
  return null
}

function getTopicScope(urlStr: string): string {
  try {
    const u = new URL(urlStr)
    let p = u.pathname.replace(/\/$/, '')
    if (p.endsWith('/overview') || p.endsWith('/introduction') || p.endsWith('/index')) {
      p = p.substring(0, p.lastIndexOf('/'))
    }
    return `${p}/`
  } catch {
    return urlStr
  }
}

async function probeChildSidebar(
  cardUrl: string,
  isWithinScope: (url: string) => boolean,
): Promise<NavItem[] | null> {
  try {
    const res = await fetch(cardUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentCache/1.0)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const dom = new JSDOM(html)
    const doc = dom.window.document

    const topicScope = getTopicScope(cardUrl)

    const nav = doc.querySelector(
      'nav[aria-labelledby*="nav"], nav[class*="border-r"], nav[aria-label*="sidebar" i], aside nav, .docs-sidebar',
    )
    if (!nav) return null

    const cardNorm = new URL(cardUrl).pathname.replace(/\/$/, '')
    const seenUrls = new Set<string>()

    // 1. Check if sidebar has structured group headers
    const headerEls = Array.from(
      nav.querySelectorAll(
        'span.font-mono, [class*="uppercase"], [class*="group-header"], [class*="tracking-wider"], h3, h4',
      ),
    )

    const firstHeader = headerEls[0]
    const rootItems: NavItem[] = []
    const allNavLinks = Array.from(nav.querySelectorAll('a[href]'))

    if (firstHeader) {
      for (const a of allNavLinks) {
        if (firstHeader.compareDocumentPosition(a) & 2) {
          const href = a.getAttribute('href') || ''
          if (
            !href ||
            href.startsWith('#') ||
            href.startsWith('javascript:') ||
            href.startsWith('mailto:')
          )
            continue
          try {
            const full = new URL(href, cardUrl)
            if (!full.pathname.startsWith(topicScope)) continue
            if (!isWithinScope(full.href)) continue
            const norm = full.pathname.replace(/\/$/, '')
            if (norm === cardNorm || seenUrls.has(full.href)) continue
            seenUrls.add(full.href)
            const titleEl = a.querySelector('div, span, p, h3, h4, strong') || a
            const title = titleEl.textContent?.trim() || a.textContent?.trim() || ''
            if (title && title.length <= 100) {
              rootItems.push({ title, url: full.href, order: rootItems.length + 1 })
            }
          } catch {}
        }
      }
    }

    const groups: NavItem[] = []

    for (const h of headerEls) {
      const groupTitle = h.textContent?.trim()
      if (!groupTitle || groupTitle.length > 50 || /main menu/i.test(groupTitle)) continue

      const container = h.closest('div, section, ul')
      if (!container) continue

      const links = Array.from(container.querySelectorAll('a[href]'))
      const items: NavItem[] = []

      for (const a of links) {
        const href = a.getAttribute('href') || ''
        if (
          !href ||
          href.startsWith('#') ||
          href.startsWith('javascript:') ||
          href.startsWith('mailto:')
        )
          continue

        try {
          const full = new URL(href, cardUrl)
          if (!full.pathname.startsWith(topicScope)) continue
          if (!isWithinScope(full.href)) continue

          const norm = full.pathname.replace(/\/$/, '')
          if (norm === cardNorm || seenUrls.has(full.href)) continue
          seenUrls.add(full.href)

          const titleEl = a.querySelector('div, span, p, h3, h4, strong') || a
          const title = titleEl.textContent?.trim() || a.textContent?.trim() || ''
          if (title && title.length <= 100) {
            items.push({ title, url: full.href, order: items.length + 1 })
          }
        } catch {}
      }

      if (items.length > 0) {
        groups.push({
          title: groupTitle,
          url: items[0].url,
          order: groups.length + 1,
          items,
        })
      }
    }

    if (groups.length >= 2 || rootItems.length > 0) {
      return [...rootItems, ...groups]
    }

    // 2. Fallback to flat list of topic links if no groups found
    const allLinks = Array.from(nav.querySelectorAll('a[href]'))
    const flatItems: NavItem[] = []
    for (const a of allLinks) {
      const href = a.getAttribute('href') || ''
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:')
      )
        continue

      try {
        const full = new URL(href, cardUrl)
        if (!full.pathname.startsWith(topicScope)) continue
        if (!isWithinScope(full.href)) continue

        const norm = full.pathname.replace(/\/$/, '')
        if (norm === cardNorm || seenUrls.has(full.href)) continue
        seenUrls.add(full.href)

        const titleEl = a.querySelector('h3, h4, p, span, strong') || a
        const title = titleEl.textContent?.trim() || a.textContent?.trim() || ''
        if (title && title.length <= 100) {
          flatItems.push({
            title,
            url: full.href,
            order: flatItems.length + 1,
          })
        }
      } catch {}
    }

    return flatItems.length >= 2 ? flatItems : null
  } catch {
    return null
  }
}

async function extractHubSections(
  doc: Document,
  baseDocsUrl: string,
  isWithinScope: (url: string) => boolean,
): Promise<NavHierarchy | null> {
  const contentArea =
    doc.querySelector('.page-content, main, article, #page-content-wrapper, .content') || doc.body
  // Target explicit documentation hub category headings (avoid in-page right-hand TOCs)
  const headings = Array.from(
    contentArea.querySelectorAll(
      '.well h3, .well h4, .col-md-6 h3, .category h2, .category h3, h2',
    ),
  )
  const sections: NavSection[] = []
  let sIdx = 1

  for (const h of headings) {
    const title = h.textContent?.trim().replace(/[:\s]+$/, '')
    if (!title || title.length > 60) continue

    // Find parent container (card grid, bordered category section, or well)
    const container =
      h.closest(
        '.well, .col-md-6, .category, .hub-section, div[class*="border"], div[class*="grid"], section',
      ) || h.parentElement
    if (!container) continue

    const links = Array.from(container.querySelectorAll('a[href]'))
    const items: NavItem[] = []
    let iIdx = 1

    for (const a of links) {
      const href = a.getAttribute('href')
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('javascript:')
      )
        continue

      // Card title extraction: prefer heading, bold title, or clean text container
      const titleEl =
        a.querySelector(
          'h3, h4, p.text-base, p.font-medium, strong, span.text-base, [class*="title"]',
        ) || a
      const descEl = a.querySelector(
        'p.text-sm, span.text-sm, span[class*="text-foreground-light"], span[class*="description"]',
      )

      let cleanTitle = titleEl.textContent?.trim() || a.textContent?.trim() || ''
      const desc = descEl?.textContent?.trim() || ''

      if (desc && cleanTitle.includes(desc)) {
        cleanTitle = cleanTitle.replace(desc, '').trim()
      }
      if (/explore more|more on/i.test(cleanTitle) && cleanTitle.length > 30) {
        const short = cleanTitle.split(/about|\/guides/i)[0].trim()
        cleanTitle = short || cleanTitle
      }

      if (!cleanTitle || cleanTitle.length > 80) continue

      try {
        const full = new URL(href, baseDocsUrl).href
        if (isWithinScope(full) && !items.some((it) => it.url === full)) {
          items.push({ title: cleanTitle, url: full, order: iIdx++ })
        }
      } catch {}
    }

    if (items.length >= 2) {
      sections.push({
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        order: sIdx++,
        items,
      })
    }
  }

  if (sections.length >= 2) {
    async function probeSectionModule(
      section: NavSection,
      baseDocsUrl: string,
      isWithinScope: (url: string) => boolean,
    ): Promise<NavSection | null> {
      if (section.items.length < 2) return null

      // Find longest common path prefix across all items in this section
      const pathLists = section.items.map((it) => {
        try {
          return new URL(it.url).pathname.split('/').filter(Boolean)
        } catch {
          return []
        }
      })
      if (pathLists.length === 0 || pathLists[0].length === 0) return null

      const commonSegments: string[] = []
      for (let i = 0; i < pathLists[0].length; i++) {
        const seg = pathLists[0][i]
        if (pathLists.every((p) => p[i] === seg)) {
          commonSegments.push(seg)
        } else {
          break
        }
      }

      let commonPath = `/${commonSegments.join('/')}`
      if (commonPath.endsWith('/quickstarts')) {
        commonPath = commonPath.replace(/\/quickstarts$/, '')
      }

      if (commonPath.split('/').filter(Boolean).length < 2) return null

      try {
        const parentUrl = new URL(commonPath, baseDocsUrl).href
        const res = await fetch(parentUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentCache/1.0)' },
          signal: AbortSignal.timeout(6000),
        })
        if (!res.ok) return null
        const html = await res.text()
        const dom = new JSDOM(html)
        const doc = dom.window.document

        const nav = doc.querySelector(
          'nav[aria-labelledby*="nav"], nav[class*="border-r"], nav[aria-label*="sidebar" i], aside nav, .docs-sidebar',
        )
        if (!nav) return null

        const headerEls = Array.from(
          nav.querySelectorAll(
            'span.font-mono, [class*="uppercase"], [class*="group-header"], [class*="tracking-wider"], h3, h4',
          ),
        )
        if (headerEls.length < 2) return null

        const seenUrls = new Set<string>()
        const firstHeader = headerEls[0]
        const rootItems: NavItem[] = []
        const allNavLinks = Array.from(nav.querySelectorAll('a[href]'))

        if (firstHeader) {
          for (const a of allNavLinks) {
            if (firstHeader.compareDocumentPosition(a) & 2) {
              const href = a.getAttribute('href') || ''
              if (
                !href ||
                href.startsWith('#') ||
                href.startsWith('javascript:') ||
                href.startsWith('mailto:')
              )
                continue
              try {
                const full = new URL(href, parentUrl)
                if (!isWithinScope(full.href)) continue
                if (seenUrls.has(full.href)) continue
                seenUrls.add(full.href)
                const titleEl = a.querySelector('div, span, p, h3, h4, strong') || a
                const title = titleEl.textContent?.trim() || a.textContent?.trim() || ''
                if (title && title.length <= 100) {
                  rootItems.push({ title, url: full.href, order: rootItems.length + 1 })
                }
              } catch {}
            }
          }
        }

        const groups: NavItem[] = []

        for (const h of headerEls) {
          const groupTitle = h.textContent?.trim()
          if (!groupTitle || groupTitle.length > 50 || /main menu/i.test(groupTitle)) continue

          const container = h.closest('div, section, ul')
          if (!container) continue

          const links = Array.from(container.querySelectorAll('a[href]'))
          const items: NavItem[] = []

          for (const a of links) {
            const href = a.getAttribute('href') || ''
            if (
              !href ||
              href.startsWith('#') ||
              href.startsWith('javascript:') ||
              href.startsWith('mailto:')
            )
              continue

            try {
              const full = new URL(href, parentUrl)
              if (!isWithinScope(full.href)) continue
              if (seenUrls.has(full.href)) continue
              seenUrls.add(full.href)

              const titleEl = a.querySelector('div, span, p, h3, h4, strong') || a
              const title = titleEl.textContent?.trim() || a.textContent?.trim() || ''
              if (title && title.length <= 100) {
                items.push({ title, url: full.href, order: items.length + 1 })
              }
            } catch {}
          }

          if (items.length > 0) {
            groups.push({
              title: groupTitle,
              url: items[0].url,
              order: groups.length + 1,
              items,
            })
          }
        }

        if (groups.length >= 2 || rootItems.length > 0) {
          const moduleTitle = doc.querySelector('h1')?.textContent?.trim() || section.title
          const combinedItems = [...rootItems, ...groups]
          return {
            title: moduleTitle,
            slug: moduleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            order: section.order,
            items: combinedItems,
          }
        }
      } catch {}

      return null
    }

    // 1. Check if any section belongs to a common parent documentation module (e.g. Getting Started)
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx]
      const parentModule = await probeSectionModule(sec, baseDocsUrl, isWithinScope)
      if (parentModule) {
        sections[sIdx] = parentModule
      }
    }

    // 2. Probe cards across sections to expand child topic sidebars
    const allCards: NavItem[] = []
    for (const s of sections) {
      for (const it of s.items) {
        if (!it.items || it.items.length === 0) {
          allCards.push(it)
        }
      }
    }

    const concurrency = 8
    for (let i = 0; i < allCards.length; i += concurrency) {
      const batch = allCards.slice(i, i + concurrency)
      await Promise.all(
        batch.map(async (it) => {
          const sub = await probeChildSidebar(it.url, isWithinScope)
          if (sub && sub.length >= 2) {
            it.items = sub.map((c, idx) => ({ ...c, order: idx + 1 }))
          }
        }),
      )
    }

    return {
      title: new URL(baseDocsUrl).hostname,
      sections,
    }
  }
  return null
}

function extractSphinxHierarchy(
  doc: Document,
  baseDocsUrl: string,
  isWithinScope: (url: string) => boolean,
): NavHierarchy | null {
  // Sphinx uses .wy-menu-vertical (RTD theme), .sphinxsidebar, or .toctree-wrapper
  const sphinxNav =
    doc.querySelector('.wy-menu-vertical') ||
    doc.querySelector('.sphinxsidebar') ||
    doc.querySelector('nav[aria-label*="Navigation menu" i]') ||
    doc.querySelector('.toctree-wrapper')

  if (!sphinxNav) return null

  const sections: NavSection[] = []
  let sIdx = 1

  // Check if there are explicit captions (e.g. <p class="caption"> or <span class="caption-text">)
  const captionEls = Array.from(
    doc.querySelectorAll(
      '.wy-menu-vertical p.caption, .sphinxsidebar p.caption, .toctree-wrapper p.caption',
    ),
  )

  if (captionEls.length >= 2) {
    for (const capEl of captionEls) {
      const capTitle = capEl.textContent?.trim().replace(/[:\s]+$/, '') || 'General'
      const nextUl = capEl.nextElementSibling
      const links = nextUl ? Array.from(nextUl.querySelectorAll('a[href]')) : []
      const items: NavItem[] = []
      let iIdx = 1

      for (const a of links) {
        const itemTitle = a.textContent?.trim()
        const href = a.getAttribute('href')
        if (
          !href ||
          !itemTitle ||
          href.startsWith('#') ||
          href.startsWith('mailto:') ||
          href.startsWith('javascript:')
        )
          continue
        // Remove Sphinx link anchor glyphs
        const cleanTitle = itemTitle.replace(/[¶#]$/, '').trim()
        try {
          const full = new URL(href, baseDocsUrl).href
          if (isWithinScope(full) && !items.some((it) => it.url === full)) {
            items.push({ title: cleanTitle, url: full, order: iIdx++ })
          }
        } catch {}
      }

      if (items.length > 0) {
        sections.push({
          title: capTitle,
          slug: capTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          order: sIdx++,
          items,
        })
      }
    }
  }

  // If no multiple captions, extract top-level chapters from toctree-l1 elements
  if (sections.length < 2) {
    const toctreeLis = Array.from(
      doc.querySelectorAll(
        '.wy-menu-vertical li.toctree-l1, .sphinxsidebar li.toctree-l1, .toctree-wrapper > ul > li.toctree-l1',
      ),
    )

    const seenUrls = new Set<string>()
    const topItems: NavItem[] = []
    let iIdx = 1

    for (const li of toctreeLis) {
      const a = li.querySelector(':scope > a') || li.querySelector('a')
      if (!a) continue
      const rawTitle = a.textContent?.trim() || ''
      const href = a.getAttribute('href') || ''
      if (
        !href ||
        !rawTitle ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('javascript:')
      )
        continue

      const cleanTitle = rawTitle.replace(/[¶#]$/, '').trim()
      try {
        const full = new URL(href, baseDocsUrl).href
        if (isWithinScope(full) && !seenUrls.has(full)) {
          seenUrls.add(full)
          topItems.push({
            title: cleanTitle,
            url: full,
            order: iIdx++,
          })
        }
      } catch {}
    }

    if (topItems.length > 0) {
      const pageHeading =
        doc
          .querySelector('.rst-content h1, main h1, [role="main"] h1, h1')
          ?.textContent?.replace(/[¶#]$/, '')
          .trim() || 'Documentation'

      sections.push({
        title: pageHeading,
        slug: pageHeading.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        order: sIdx++,
        items: topItems,
      })
    }
  }

  const totalItemCount = sections.reduce((acc, s) => acc + s.items.length, 0)
  if (sections.length >= 1 && totalItemCount >= 2) {
    return {
      title: new URL(baseDocsUrl).hostname,
      sections,
    }
  }
  return null
}

export async function extractSiteTopology(
  docsUrl: string,
  options?: TopologyOptions,
): Promise<NavHierarchy> {
  const url = new URL(docsUrl)
  const origin = url.origin
  const baseDocsUrl =
    docsUrl.endsWith('/') || /\.[a-z0-9]+$/i.test(docsUrl) ? docsUrl : `${docsUrl}/`

  // Calculate scope: only enforce subpath prefix if it is an actual directory prefix (e.g. /docs/), NOT a single hub file (/documentation.html)
  const rawPath = url.pathname.replace(/\/$/, '')
  const isSingleFileHub = /\.[a-z0-9]+$/i.test(rawPath)
  const docsScopePrefix = isSingleFileHub ? '' : rawPath
  const isSubpathDocs = docsScopePrefix.length > 0 && docsScopePrefix !== '/'
  const sections: NavSection[] = []

  // Normalized URL map to avoid duplicate crawls
  const discoveredMap = new Map<string, DiscoveredPage>()

  function normalizeUrl(u: string): string {
    return u.replace(/\/$/, '').replace(/\.(html|mdx?)$/i, '')
  }

  function isWithinScope(candidateUrl: string): boolean {
    if (!candidateUrl.startsWith(origin)) return false

    try {
      const candUrl = new URL(candidateUrl)
      if (NON_DOCS_FILTER.test(candUrl.pathname)) return false

      if (isSubpathDocs) {
        const candPath = candUrl.pathname
        if (!candPath.startsWith(`${docsScopePrefix}/`) && candPath !== docsScopePrefix) {
          return false
        }
      }
      return true
    } catch {
      return false
    }
  }

  // 1. Tier 1: HTML Inspection & Live DOM Sidebar Extraction
  try {
    const res = await fetch(docsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (res.ok) {
      const html = await res.text()

      // 1a. Check for Mintlify multi-tab embedded scopedNav tree
      const mintlifyTree = await extractMintlifyHierarchy(docsUrl, html)
      if (mintlifyTree && mintlifyTree.sections.length >= 2) {
        return mintlifyTree
      }

      // 1b. Check for Stripe multi-nested hydration navigation tree
      const stripeTree = extractStripeHierarchy(docsUrl, html)
      if (stripeTree && stripeTree.sections.length >= 2) {
        return stripeTree
      }

      const dom = new JSDOM(html)
      const doc = dom.window.document

      // 1b. Check for mdBook chapter sidebar (Rust, Zed, Tokio, Tauri, etc.)
      const mdBookTree = extractMdBookHierarchy(doc, baseDocsUrl, isWithinScope)
      if (mdBookTree && mdBookTree.sections.length >= 1) {
        return mdBookTree
      }

      // 1c. Check for GitHub Primer / ActionList navigation (docs.npmjs.com, GitHub Docs, etc.)
      const primerTree = extractPrimerHierarchy(doc, baseDocsUrl, isWithinScope)
      if (primerTree && primerTree.sections.length >= 2) {
        return primerTree
      }

      // 1d. Check for modern structured sidebar groups (Cursor, Tailwind, Next, Radix, shadcn)
      const groupedTree = await extractGroupedSidebarHierarchy(doc, baseDocsUrl, isWithinScope)
      if (groupedTree && groupedTree.sections.length >= 2) {
        return groupedTree
      }

      // 1c. Check for documentation hub page (FFmpeg, legacy categorised index pages)
      const hubTree = await extractHubSections(doc, baseDocsUrl, isWithinScope)
      if (hubTree && hubTree.sections.length >= 2) {
        return hubTree
      }

      // 1d. Check for Sphinx / ReadTheDocs navigation
      const sphinxTree = extractSphinxHierarchy(doc, baseDocsUrl, isWithinScope)
      if (sphinxTree && sphinxTree.sections.length >= 1) {
        return sphinxTree
      }

      // 1c. Generic Live DOM Sidebar Extraction (only target docs/sidebar navigation)
      const navEl =
        doc.querySelector('nav[data-left-nav]') ||
        doc.querySelector('aside nav') ||
        doc.querySelector('nav[aria-label*="sidebar" i]') ||
        doc.querySelector('nav[aria-label*="Documentation" i]') ||
        doc.querySelector('nav.border-r, nav[class*="border-r"]') ||
        doc.querySelector('.docs-sidebar') ||
        doc.querySelector('#docs-sidebar') ||
        doc.querySelector('aside')

      if (navEl) {
        const headings = navEl.querySelectorAll(
          'h3, h4, h5, [class*="title"], [class*="group-header"], [class*="section-header"]',
        )

        if (headings.length > 0) {
          let sIdx = 1
          for (const heading of Array.from(headings)) {
            const title = (heading.textContent || '').trim()
            if (!title) continue

            const parent = heading.closest('div, section, ul') || heading.parentElement
            const links = parent ? Array.from(parent.querySelectorAll('a[href]')) : []

            const items: NavItem[] = []
            let iIdx = 1
            for (const a of links) {
              const itemTitle = (a.textContent || '').trim()
              const href = a.getAttribute('href') || ''
              if (!itemTitle || !href || href.startsWith('#') || href.startsWith('javascript:'))
                continue

              try {
                const fullUrl = new URL(href, baseDocsUrl).href
                if (isWithinScope(fullUrl)) {
                  const norm = normalizeUrl(fullUrl)
                  if (!items.some((it) => normalizeUrl(it.url) === norm)) {
                    items.push({
                      title: itemTitle,
                      url: fullUrl,
                      order: iIdx++,
                    })
                    discoveredMap.set(norm, { title: itemTitle, url: fullUrl, sectionName: title })
                  }
                }
              } catch {}
            }

            if (items.length > 0) {
              sections.push({
                title,
                slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                order: sIdx++,
                items,
              })
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[Topology] DOM sidebar probe failed for ${docsUrl}:`, err)
  }

  // If DOM sidebar yielded rich structure (>= 2 sections and >= 4 items), return it directly!
  let domItemCount = 0
  for (const s of sections) domItemCount += s.items.length
  if (sections.length >= 2 && domItemCount >= 4) {
    return {
      title: url.hostname,
      sections,
    }
  }

  // 2. Tier 2: Probe llms.txt (with structured markdown sections)
  const llmsCandidates = [
    options?.llmsTxtUrl,
    `${origin}/llms.txt`,
    `${origin}${docsScopePrefix}/llms.txt`,
  ].filter(Boolean) as string[]

  for (const candidate of llmsCandidates) {
    try {
      const res = await fetch(candidate, {
        headers: { 'User-Agent': 'agent-cache-probe/1.0' },
        signal: AbortSignal.timeout(4000),
      })
      if (res.ok) {
        const text = await res.text()
        const lines = text.split('\n')
        let currentSection = 'Overview'

        // If the llms.txt links to section index files (e.g. /llms/get-started.txt, /llms/build.txt),
        // fetch those section files to discover the complete official taxonomy
        const subIndexLinks: { title: string; url: string }[] = []
        for (const line of lines) {
          const m = /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/.exec(line.trim())
          if (m) {
            const rawHref = m[2].trim()
            if (rawHref.includes('/llms/') && rawHref.endsWith('.txt')) {
              try {
                const subUrl = new URL(rawHref, baseDocsUrl).href
                if (isWithinScope(subUrl)) {
                  subIndexLinks.push({ title: m[1].trim(), url: subUrl })
                }
              } catch {}
            }
          }
        }

        if (subIndexLinks.length > 0) {
          for (const subIndex of subIndexLinks) {
            try {
              const subRes = await fetch(subIndex.url, {
                headers: { 'User-Agent': 'agent-cache-probe/1.0' },
                signal: AbortSignal.timeout(4000),
              })
              if (subRes.ok) {
                const subText = await subRes.text()
                for (const subLine of subText.split('\n')) {
                  const m = /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/.exec(subLine.trim())
                  if (m) {
                    try {
                      const fullUrl = new URL(m[2].trim(), baseDocsUrl).href
                      if (isWithinScope(fullUrl) && !fullUrl.endsWith('.txt')) {
                        const norm = normalizeUrl(fullUrl)
                        if (!discoveredMap.has(norm)) {
                          discoveredMap.set(norm, {
                            title: m[1].trim(),
                            url: fullUrl,
                            sectionName: subIndex.title,
                          })
                        }
                      }
                    } catch {}
                  }
                }
              }
            } catch {}
          }
        } else {
          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
              currentSection = trimmed.replace(/^#+\s*/, '').trim()
              continue
            }

            const m = /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/.exec(trimmed)
            if (m) {
              try {
                const rawHref = m[2].trim()
                const linkTitle = m[1].trim()
                const fullUrl = new URL(rawHref, baseDocsUrl).href
                if (isWithinScope(fullUrl) && !fullUrl.endsWith('.txt')) {
                  const norm = normalizeUrl(fullUrl)
                  if (!discoveredMap.has(norm)) {
                    discoveredMap.set(norm, {
                      title: linkTitle,
                      url: fullUrl,
                      sectionName: currentSection,
                    })
                  }
                }
              } catch {}
            }
          }
        }
        if (discoveredMap.size >= 4) break
      }
    } catch {}
  }

  // 3. Tier 3: Probe Sitemaps
  for (const sPath of ['/sitemap.xml', `${docsScopePrefix}/sitemap.xml`, '/sitemap-0.xml']) {
    try {
      const res = await fetch(`${origin}${sPath}`, {
        headers: { 'User-Agent': 'agent-cache-probe/1.0' },
        signal: AbortSignal.timeout(4000),
      })
      if (res.ok) {
        const xml = await res.text()
        const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g
        let m: RegExpExecArray | null = locRegex.exec(xml)
        while (m !== null) {
          const loc = m[1].trim()
          if (isWithinScope(loc)) {
            // If the target wasn't already an explicit docs path or subdomain,
            // only accept sitemap routes that actually look like documentation
            if (
              !isSubpathDocs &&
              !COMMON_DOCS_SUBDOMAINS.some((sub) => url.hostname.startsWith(`${sub}.`))
            ) {
              const p = new URL(loc).pathname.toLowerCase()
              const isDocRoute =
                /docs|doc\b|documentation|api|guide|manual|reference|tutorial/i.test(p)
              if (!isDocRoute) {
                m = locRegex.exec(xml)
                continue
              }
            }

            const norm = normalizeUrl(loc)
            if (!discoveredMap.has(norm)) {
              discoveredMap.set(norm, { title: '', url: loc })
            }
          }
          m = locRegex.exec(xml)
        }
      }
    } catch {}
  }

  // 4. Tier 4: Katana Crawler Fallback (if fewer than 4 pages found)
  // Only crawl if URL explicitly targets docs or a doc subdomain to avoid crawling arbitrary SaaS landing pages
  const isDocTarget =
    isSubpathDocs ||
    /docs|documentation|api-reference|api\b|manual|guide/i.test(url.pathname) ||
    COMMON_DOCS_SUBDOMAINS.some((sub) => url.hostname.startsWith(`${sub}.`))

  if (discoveredMap.size < 4 && isDocTarget) {
    await options?.onProgress?.({
      type: 'log',
      level: 'info',
      message: `Fast crawler discovering pages on ${origin}...`,
      timestamp: Date.now(),
    })

    await new Promise<void>((resolve) => {
      let isSettled = false
      const finish = () => {
        if (!isSettled) {
          isSettled = true
          resolve()
        }
      }

      // Hard timeout of 10s to never hang the engine
      const timer = setTimeout(() => {
        try {
          proc.kill('SIGKILL')
        } catch {}
        finish()
      }, 10000)

      const proc = spawn(
        'katana',
        ['-u', docsUrl, '-fs', 'fqdn', '-d', '2', '-c', '6', '-silent'],
        { stdio: ['ignore', 'pipe', 'ignore'] },
      )

      let buffer = ''
      proc.stdout?.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line) continue
          if (isWithinScope(line)) {
            const norm = normalizeUrl(line)
            if (!discoveredMap.has(norm)) {
              discoveredMap.set(norm, { title: '', url: line })
              if (discoveredMap.size % 5 === 0) {
                options
                  ?.onProgress?.({
                    type: 'log',
                    level: 'info',
                    message: `[${discoveredMap.size} pages] ${line}`,
                    timestamp: Date.now(),
                  })
                  .catch(() => {})
              }
            }
          }
        }
      })

      proc.on('error', () => finish())
      proc.on('close', () => {
        clearTimeout(timer)
        finish()
      })
    })
  }

  // If still empty, only add docsUrl as single root page if the URL explicitly targets docs
  // (e.g. /docs, /api, docs.foo.com, or single file docs like readme.md / doc.html)
  // Otherwise, allow discoveredMap to remain empty so index.ts throws ErrorFactory.zeroPages!
  if (discoveredMap.size === 0) {
    const isExplicitDocTarget =
      /docs|documentation|api-reference|api\b|manual|guide/i.test(url.pathname) ||
      COMMON_DOCS_SUBDOMAINS.some((sub) => url.hostname.startsWith(`${sub}.`)) ||
      /\.(md|mdx|html|txt)$/i.test(url.pathname)

    if (isExplicitDocTarget) {
      discoveredMap.set(normalizeUrl(docsUrl), {
        title: 'Documentation Overview',
        url: docsUrl,
        sectionName: 'Overview',
      })
    }
  }

  // 5. Smart Grouping by URL segments into ordered sections
  const groupMap = new Map<string, NavItem[]>()

  for (const [_norm, page] of discoveredMap.entries()) {
    const pageUrl = new URL(page.url)
    // Clean root doc prefixes cleanly with word boundaries
    const cleanPath = pageUrl.pathname
      .replace(/^\/(?:docs|documentation|guides?|api-reference|api)\b\/?/i, '')
      .replace(/^\//, '')
    const segments = cleanPath.split('/').filter(Boolean)

    let secName = page.sectionName || 'Overview'
    let itemTitle = page.title

    if (!page.sectionName) {
      if (segments.length > 1) {
        secName = segments[0].replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      } else {
        secName = 'Documentation'
      }
    }

    if (!itemTitle) {
      const lastSeg = segments[segments.length - 1] || 'Documentation'
      itemTitle = lastSeg
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    }

    secName = secName.trim()

    let groupList = groupMap.get(secName)
    if (!groupList) {
      // Also check case-insensitively in case of existing key with different casing
      for (const existingKey of groupMap.keys()) {
        if (existingKey.toLowerCase() === secName.toLowerCase()) {
          secName = existingKey
          groupList = groupMap.get(existingKey)
          break
        }
      }
    }
    if (!groupList) {
      groupList = []
      groupMap.set(secName, groupList)
    }
    if (!groupList.some((it) => it.url === page.url)) {
      groupList.push({
        title: itemTitle,
        url: page.url,
        order: groupList.length + 1,
      })
    }
  }

  // Preserve natural discovery order from the site
  const finalSections: NavSection[] = Array.from(groupMap.entries()).map(
    ([secName, items], sIdx) => {
      return {
        title: secName,
        slug: secName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        order: sIdx + 1,
        items: items.map((it, iIdx) => ({
          ...it,
          order: iIdx + 1,
        })),
      }
    },
  )

  return {
    title: url.hostname,
    sections: finalSections,
  }
}
