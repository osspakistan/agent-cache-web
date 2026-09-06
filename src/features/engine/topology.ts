import { spawn } from 'node:child_process'
import { JSDOM } from 'jsdom'
import type { NavHierarchy, NavItem, NavSection, StreamEvent } from '../../lib/utils/types'

const NON_DOCS_FILTER =
  /blog|changelog|news|pricing|legal|careers|jobs|podcast|contact|privacy|terms|cookie|press|status|login|signup|acp\b|agents?\b|marketplace|store|assets?|_next|_astro|_nuxt|cdn-cgi|\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|eot|json|map|zip|tar|gz)(\?.*)?$/i

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
            const fullUrl = new URL(href, docsUrl).href
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

  // Probe remaining tabs (e.g. "API Reference" on docs.context.dev)
  for (const tab of initialNav.tabs || []) {
    if (tab.tab && !processedTabs.has(tab.tab)) {
      const tabName = tab.tab
      const tabSlug = tabName.toLowerCase().replace(/\s+/g, '-')
      const candidateUrls = [`${origin}/${tabSlug}`, `${origin}/api-reference`, `${origin}/docs`]
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

  const sections: NavSection[] = []
  let currentSectionTitle = 'Getting Started'
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
      currentSectionTitle = child.textContent?.trim() || 'Overview'
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

  if (sections.length >= 2) {
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

function extractHubSections(
  doc: Document,
  baseDocsUrl: string,
  isWithinScope: (url: string) => boolean,
): NavHierarchy | null {
  const contentArea =
    doc.querySelector('.page-content, main, article, #page-content-wrapper, .content') || doc.body
  const headings = Array.from(contentArea.querySelectorAll('h2, h3, h4, .well h3, .well h4'))
  const sections: NavSection[] = []
  let sIdx = 1

  for (const h of headings) {
    const title = h.textContent?.trim().replace(/[:\s]+$/, '')
    if (!title || title.length > 50) continue
    const container = h.closest('.well, .col-md-6, .section, div') || h.parentElement
    if (!container) continue

    const links = Array.from(container.querySelectorAll('a[href]'))
    const items: NavItem[] = []
    for (const a of links) {
      const href = a.getAttribute('href')
      const itemTitle = a.textContent?.trim()
      if (
        !href ||
        !itemTitle ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('javascript:')
      )
        continue
      try {
        const full = new URL(href, baseDocsUrl).href
        if (isWithinScope(full)) {
          if (!items.some((it) => it.url === full)) {
            items.push({ title: itemTitle, url: full, order: items.length + 1 })
          }
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
    if (NON_DOCS_FILTER.test(candidateUrl)) return false

    if (isSubpathDocs) {
      try {
        const candPath = new URL(candidateUrl).pathname
        if (!candPath.startsWith(`${docsScopePrefix}/`) && candPath !== docsScopePrefix) {
          return false
        }
      } catch {
        return false
      }
    }
    return true
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
      if (mdBookTree && mdBookTree.sections.length >= 2) {
        return mdBookTree
      }

      // 1c. Check for GitHub Primer / ActionList navigation (docs.npmjs.com, GitHub Docs, etc.)
      const primerTree = extractPrimerHierarchy(doc, baseDocsUrl, isWithinScope)
      if (primerTree && primerTree.sections.length >= 2) {
        return primerTree
      }

      // 1c. Check for documentation hub page (FFmpeg, legacy categorised index pages)
      const hubTree = extractHubSections(doc, baseDocsUrl, isWithinScope)
      if (hubTree && hubTree.sections.length >= 2) {
        return hubTree
      }

      // 1c. Generic Live DOM Sidebar Extraction
      const navEl =
        doc.querySelector('nav[data-left-nav]') ||
        doc.querySelector('aside nav') ||
        doc.querySelector('nav[aria-label*="sidebar"]') ||
        doc.querySelector('nav[aria-label*="Documentation"]') ||
        doc.querySelector('aside') ||
        doc.querySelector('nav')

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
  if (discoveredMap.size < 4) {
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

  // If still empty, add docsUrl as single root page
  if (discoveredMap.size === 0) {
    discoveredMap.set(normalizeUrl(docsUrl), {
      title: 'Documentation Overview',
      url: docsUrl,
      sectionName: 'Overview',
    })
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
      if (pageUrl.pathname.startsWith('/api-reference') || pageUrl.pathname.startsWith('/api/')) {
        secName =
          segments.length > 1
            ? segments[0].replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            : 'API Reference'
      } else if (pageUrl.pathname.startsWith('/guides') || pageUrl.pathname.startsWith('/guide')) {
        secName = 'Guides'
      } else if (segments.length <= 1) {
        secName = 'Getting Started'
      } else {
        secName = segments[0].replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      }
    }

    if (!itemTitle) {
      const lastSeg = segments[segments.length - 1] || 'Overview'
      itemTitle = lastSeg.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }

    let groupList = groupMap.get(secName)
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

  // Sort sections logically: Overview / Getting Started first, Guides second, Reference third
  const sectionRank = (title: string): number => {
    const lower = title.toLowerCase()
    if (lower.includes('start') || lower.includes('intro') || lower.includes('overview')) return 1
    if (lower.includes('guide') || lower.includes('tutorial') || lower.includes('concept')) return 2
    if (lower.includes('core') || lower.includes('feature')) return 3
    if (lower.includes('api') || lower.includes('reference') || lower.includes('sdk')) return 4
    if (lower.includes('config') || lower.includes('deploy') || lower.includes('advanced')) return 5
    return 6
  }

  const sortedSecNames = Array.from(groupMap.keys()).sort((a, b) => {
    const rankDiff = sectionRank(a) - sectionRank(b)
    if (rankDiff !== 0) return rankDiff
    return a.localeCompare(b)
  })

  const finalSections: NavSection[] = sortedSecNames.map((secName, sIdx) => {
    const items = groupMap.get(secName) || []
    return {
      title: secName,
      slug: secName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      order: sIdx + 1,
      items: items.map((it, iIdx) => ({
        ...it,
        order: iIdx + 1,
      })),
    }
  })

  return {
    title: url.hostname,
    sections: finalSections,
  }
}
