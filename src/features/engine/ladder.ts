import type { StrategyType } from '../../lib/utils/types'

export interface LadderDecision {
  strategy: StrategyType
  hasLlmsFull: boolean
  llmsFullUrl?: string
  hasLlmsTxt: boolean
  llmsTxtUrl?: string
  gitRepo?: { owner: string; repo: string; branch: string; docsPath: string }
  directMdSampleUrl?: string
  sitemapUrl?: string
}

export async function probeAcquisitionLadder(docsUrl: string): Promise<LadderDecision> {
  const url = new URL(docsUrl)
  const origin = url.origin
  const pathPrefix = url.pathname.replace(/\/$/, '')

  let hasLlmsFull = false
  let llmsFullUrl: string | undefined
  let hasLlmsTxt = false
  let llmsTxtUrl: string | undefined

  // 1. Concurrently probe companion llms-full.txt and llms.txt (parallel fast HEAD requests)
  const probeTasks: Promise<void>[] = []

  // Companion llms-full.txt probe
  probeTasks.push(
    (async () => {
      for (const candidate of [`${origin}/llms-full.txt`, `${origin}${pathPrefix}/llms-full.txt`]) {
        try {
          const res = await fetch(candidate, {
            headers: { 'User-Agent': 'agent-cache-probe/1.0' },
            signal: AbortSignal.timeout(4000),
          })
          const cType = res.headers.get('content-type') || ''
          const text = await res.text()
          if (
            res.ok &&
            text.trim().length > 10 &&
            (cType.includes('text') || cType.includes('markdown') || !cType)
          ) {
            hasLlmsFull = true
            llmsFullUrl = candidate
            break
          }
        } catch {}
      }
    })(),
  )

  // Structured llms.txt probe
  probeTasks.push(
    (async () => {
      for (const candidate of [`${origin}/llms.txt`, `${origin}${pathPrefix}/llms.txt`]) {
        try {
          const res = await fetch(candidate, {
            headers: { 'User-Agent': 'agent-cache-probe/1.0' },
            signal: AbortSignal.timeout(4000),
          })
          const cType = res.headers.get('content-type') || ''
          const text = await res.text()
          if (
            res.ok &&
            text.trim().length > 10 &&
            (cType.includes('text') || cType.includes('markdown') || !cType)
          ) {
            hasLlmsTxt = true
            llmsTxtUrl = candidate
            break
          }
        } catch {}
      }
    })(),
  )

  // 2. Tier 1: Probe direct .md endpoint & content negotiation (Mintlify / GitBook / Cloudflare / Hono standard)
  let isDirectMd = false
  let directMdSampleUrl: string | undefined

  const mdProbeTask = (async () => {
    // 2a. Check content negotiation on docsUrl itself
    try {
      const acceptRes = await fetch(docsUrl, {
        headers: {
          'User-Agent': 'agent-cache-probe/1.0',
          Accept: 'text/markdown, text/plain',
        },
        signal: AbortSignal.timeout(4000),
      })
      const acceptType = acceptRes.headers.get('content-type') || ''
      if (
        acceptRes.ok &&
        (acceptType.includes('text/markdown') || acceptType.includes('text/plain'))
      ) {
        isDirectMd = true
        directMdSampleUrl = docsUrl
        return
      }
    } catch {}

    // 2b. Check candidate .md paths
    const mdCandidates = [
      url.pathname.length > 1 ? `${origin}${url.pathname.replace(/\/$/, '')}.md` : '',
      `${origin}/index.md`,
      `${origin}/introduction.md`,
      `${origin}/quickstart.md`,
      `${origin}/docs.md`,
      `${origin}/overview.md`,
    ].filter(Boolean)

    for (const mdProbeUrl of mdCandidates) {
      try {
        const mdRes = await fetch(mdProbeUrl, {
          headers: {
            'User-Agent': 'agent-cache-probe/1.0',
            Accept: 'text/markdown, text/plain, */*',
          },
          signal: AbortSignal.timeout(3000),
        })
        const cType = mdRes.headers.get('content-type') || ''
        if (mdRes.ok && (cType.includes('text/markdown') || cType.includes('text/plain'))) {
          isDirectMd = true
          directMdSampleUrl = mdProbeUrl
          return
        }
      } catch {}
    }
  })()

  // Run probes concurrently
  await Promise.all([...probeTasks, mdProbeTask])

  if (isDirectMd) {
    return {
      strategy: 'direct-raw-md',
      hasLlmsFull,
      llmsFullUrl,
      hasLlmsTxt,
      llmsTxtUrl,
      directMdSampleUrl,
    }
  }

  // 3. Fallback: HTML Purification
  return {
    strategy: 'html-purify',
    hasLlmsFull,
    llmsFullUrl,
    hasLlmsTxt,
    llmsTxtUrl,
    sitemapUrl: `${origin}/sitemap.xml`,
  }
}
