import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'
import { uploadToR2 } from '../../lib/clients'
import type { NavHierarchy, StreamEvent } from '../../lib/utils/types'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
})

// Custom rule to preserve pre/code styling
turndown.addRule('fencedCodeBlock', {
  filter: ['pre'],
  replacement: (_content, node) => {
    const codeEl = (node as HTMLElement).querySelector('code')
    const lang = codeEl?.className?.match(/language-(\w+)/)?.[1] || ''
    const text = codeEl ? codeEl.textContent || '' : node.textContent || ''
    return `\n\`\`\`${lang}\n${text.trim()}\n\`\`\`\n\n`
  },
})

export type CrawlProgressCallback = (event: StreamEvent) => Promise<void>

export async function crawlAndExtractPages(
  jobId: string,
  hierarchy: NavHierarchy,
  _strategy: string,
  onProgress: CrawlProgressCallback,
): Promise<Map<string, Uint8Array>> {
  let doneCount = 0

  // Count total pages recursively
  function countPages(items: (typeof hierarchy.sections)[0]['items']): number {
    let count = 0
    for (const it of items) {
      count++
      if (it.items && it.items.length > 0) {
        count += countPages(it.items)
      }
    }
    return count
  }

  let totalPages = 0
  for (const sec of hierarchy.sections) {
    totalPages += countPages(sec.items)
  }

  const concurrency = 8
  const hasTabs = Boolean(hierarchy.tabs && hierarchy.tabs.length > 1)
  const tabIndexMap = new Map<string, number>()
  if (hasTabs && hierarchy.tabs) {
    hierarchy.tabs.forEach((t, idx) => {
      tabIndexMap.set(t, idx + 1)
    })
  }

  interface CrawlTask {
    tab?: string
    tabIndex?: number
    secIndex: number
    secTitle: string
    secSlug: string
    itemTitle: string
    url: string
    folderPath: string
    fileName: string
  }

  const queue: CrawlTask[] = []

  function enqueueItems(
    items: (typeof hierarchy.sections)[0]['items'],
    parentFolder: string,
    sec: (typeof hierarchy.sections)[0],
    sIdx: number,
    tIdx?: number,
  ) {
    items.forEach((item, iIdx) => {
      const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const hasChildren = Boolean(item.items && item.items.length > 0)

      if (hasChildren) {
        const nestedFolder = `${parentFolder}/${String(iIdx + 1).padStart(2, '0')}-${slug}`
        // Index page for folder
        queue.push({
          tab: sec.tab,
          tabIndex: tIdx,
          secIndex: sIdx + 1,
          secTitle: sec.title,
          secSlug: sec.slug,
          itemTitle: item.title,
          url: item.url,
          folderPath: nestedFolder,
          fileName: 'index.md',
        })
        enqueueItems(item.items || [], nestedFolder, sec, sIdx, tIdx)
      } else {
        queue.push({
          tab: sec.tab,
          tabIndex: tIdx,
          secIndex: sIdx + 1,
          secTitle: sec.title,
          secSlug: sec.slug,
          itemTitle: item.title,
          url: item.url,
          folderPath: parentFolder,
          fileName: `${String(iIdx + 1).padStart(2, '0')}-${slug}.md`,
        })
      }
    })
  }

  hierarchy.sections.forEach((sec, sIdx) => {
    const tIdx = sec.tab ? tabIndexMap.get(sec.tab) : undefined
    let baseSecFolder = `${String(sIdx + 1).padStart(2, '0')}-${sec.slug}`
    if (sec.tab && tIdx) {
      const tabFolder = `${String(tIdx).padStart(2, '0')}-${sec.tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      baseSecFolder = `${tabFolder}/${baseSecFolder}`
    }
    enqueueItems(sec.items, baseSecFolder, sec, sIdx, tIdx)
  })

  // In-flight bundle map for instant ZIP creation (avoids disk!)
  const filesMap = new Map<string, Uint8Array>()

  async function processItem(task: CrawlTask) {
    const relativePath = `final/${task.folderPath}/${task.fileName}`
    const r2Key = `jobs/${jobId}/${relativePath}`

    let markdown = ''
    try {
      // 1. Direct fetch if URL ends in .md or .mdx
      if (task.url.endsWith('.md') || task.url.endsWith('.mdx')) {
        const res = await fetch(task.url, {
          headers: { 'User-Agent': 'agent-cache/1.0' },
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) {
          markdown = await res.text()
        }
      }

      // 2. If github strategy or known doc site, try direct raw GitHub endpoints
      if (!markdown && _strategy === 'github-raw-markdown') {
        try {
          const pathSegments = new URL(task.url).pathname.replace(/^\//, '')
          const rawCandidates = [
            `https://raw.githubusercontent.com/npm/documentation/main/content/${pathSegments}/index.mdx`,
            `https://raw.githubusercontent.com/npm/documentation/main/content/${pathSegments}.mdx`,
            `https://raw.githubusercontent.com/npm/documentation/main/content/${pathSegments}.md`,
          ]
          for (const rawUrl of rawCandidates) {
            const res = await fetch(rawUrl, {
              headers: { 'User-Agent': 'agent-cache/1.0' },
              signal: AbortSignal.timeout(4000),
            })
            if (res.ok) {
              const text = await res.text()
              if (text.trim().length > 20) {
                markdown = text
                break
              }
            }
          }
        } catch {}
      }

      // 3. Try content-negotiated fetch (works for Hono, Cloudflare, Next.js docs)
      if (!markdown) {
        try {
          const res = await fetch(task.url, {
            headers: {
              'User-Agent': 'agent-cache/1.0',
              Accept: 'text/markdown, text/plain;q=0.9, text/html;q=0.8, */*;q=0.1',
            },
            signal: AbortSignal.timeout(8000),
          })
          if (res.ok) {
            const contentType = res.headers.get('content-type') || ''
            const text = await res.text()
            if (contentType.includes('markdown') || contentType.includes('text/plain')) {
              markdown = text
            }
          }
        } catch {}
      }

      // 3. Try .md URL suffix (works for Mintlify, GitBook, Zed docs)
      if (!markdown) {
        try {
          const mdUrl = `${task.url.replace(/\/$/, '')}.md`
          const res = await fetch(mdUrl, {
            headers: {
              'User-Agent': 'agent-cache/1.0',
              Accept: 'text/markdown, text/plain, */*',
            },
            signal: AbortSignal.timeout(8000),
          })
          if (res.ok) {
            const contentType = res.headers.get('content-type') || ''
            const text = await res.text()
            if (contentType.includes('markdown') || contentType.includes('text/plain')) {
              markdown = text
            }
          }
        } catch {}
      }

      // 4. Fallback: HTML fetch with Turndown purification
      if (!markdown) {
        const res = await fetch(task.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(10000),
        })
        if (res.ok) {
          const contentType = res.headers.get('content-type') || ''
          const text = await res.text()

          if (contentType.includes('markdown') || contentType.includes('text/plain')) {
            markdown = text
          } else {
            const dom = new JSDOM(text)
            try {
              const doc = dom.window.document

              // 4a. Check if the page has an "Edit on GitHub" / source link (e.g. npm docs, Docusaurus, VitePress, etc.)
              const ghSourceLink = doc.querySelector(
                'a[href*="github.com"][href*="/edit/"], a[href*="github.com"][href*="/blob/"]',
              )
              if (ghSourceLink) {
                const href = ghSourceLink.getAttribute('href') || ''
                const rawGhUrl = href
                  .replace('https://github.com/', 'https://raw.githubusercontent.com/')
                  .replace('/edit/', '/')
                  .replace('/blob/', '/')
                try {
                  const rawRes = await fetch(rawGhUrl, {
                    headers: { 'User-Agent': 'agent-cache/1.0' },
                    signal: AbortSignal.timeout(6000),
                  })
                  if (rawRes.ok) {
                    const rawMd = await rawRes.text()
                    if (rawMd.trim().length > 20) {
                      markdown = rawMd
                    }
                  }
                } catch {}
              }

              if (!markdown) {
                // Strip noise elements
                const elementsToRemove = doc.querySelectorAll(
                  'script, style, nav, header, footer, aside, noscript, svg',
                )
                elementsToRemove.forEach((el) => {
                  el.remove()
                })

                const mainContent =
                  doc.querySelector('main, article, [role="main"], .content') || doc.body
                markdown = turndown.turndown(mainContent ? mainContent.innerHTML : text)
              }
            } finally {
              dom.window.close()
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[Crawler] Failed page ${task.url}:`, err)
      markdown = `> Failed to extract content from ${task.url}\n\n*Error encountered during crawl.*`
    }

    // Prepend metadata frontmatter
    const frontmatter = `---
title: "${task.itemTitle.replace(/"/g, '\\"')}"
url: "${task.url}"
section: "${task.secTitle.replace(/"/g, '\\"')}"
---

# ${task.itemTitle}

`
    const fullContent = frontmatter + markdown
    const fileBytes = Buffer.from(fullContent, 'utf8')

    // 1. Upload directly to R2 with error isolation
    try {
      await uploadToR2(r2Key, fileBytes, 'text/markdown; charset=utf-8')
    } catch (err) {
      console.warn(`[Crawler] Failed to upload page ${r2Key} to R2:`, err)
    }

    // 2. Track in bundle map
    filesMap.set(relativePath.replace(/^final\//, ''), fileBytes)

    doneCount++

    await onProgress({
      type: 'progress',
      done: doneCount,
      total: totalPages,
      current_url: task.url,
      timestamp: Date.now(),
    })
  }

  // Run with continuous worker pool (never stalls on single slow/huge pages)
  let nextIdx = 0
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (nextIdx < queue.length) {
      const currentTask = queue[nextIdx++]
      if (currentTask) {
        await processItem(currentTask)
      }
    }
  })

  await Promise.all(workers)

  return filesMap
}
