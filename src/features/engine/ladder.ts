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

  // 1. Probe companion llms-full.txt (bonus download for R2/bundle, never replaces structure)
  for (const candidate of [`${origin}/llms-full.txt`, `${origin}${pathPrefix}/llms-full.txt`]) {
    try {
      const res = await fetch(candidate, {
        method: 'HEAD',
        headers: { 'User-Agent': 'agent-cache-probe/1.0' },
        signal: AbortSignal.timeout(3000),
      })
      const cType = res.headers.get('content-type') || ''
      if (res.ok && (cType.includes('text') || cType.includes('markdown') || !cType)) {
        hasLlmsFull = true
        llmsFullUrl = candidate
        break
      }
    } catch {}
  }

  // 2. Probe llms.txt (for structured link discovery)
  for (const candidate of [`${origin}/llms.txt`, `${origin}${pathPrefix}/llms.txt`]) {
    try {
      const res = await fetch(candidate, {
        method: 'HEAD',
        headers: { 'User-Agent': 'agent-cache-probe/1.0' },
        signal: AbortSignal.timeout(3000),
      })
      const cType = res.headers.get('content-type') || ''
      if (res.ok && (cType.includes('text') || cType.includes('markdown') || !cType)) {
        hasLlmsTxt = true
        llmsTxtUrl = candidate
        break
      }
    } catch {}
  }

  // 3. Tier 1: Check Open-Source GitHub repository in page footer/navbar
  try {
    const pageRes = await fetch(docsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (pageRes.ok) {
      const html = await pageRes.text()
      const match = html.match(/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/i)
      if (match && !match[1].toLowerCase().includes('github')) {
        const owner = match[1]
        const repo = match[2].replace(/\.git$/i, '').replace(/["'].*$/, '')

        // Check if repo has docs/ directory via GitHub trees
        const treeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
          {
            headers: { 'User-Agent': 'agent-cache-bot' },
            signal: AbortSignal.timeout(4000),
          },
        )

        if (treeRes.ok) {
          interface GitHubTreeResponse {
            tree?: Array<{ path: string; type: string }>
          }
          const treeData = (await treeRes.json()) as GitHubTreeResponse
          const mdFiles = (treeData.tree || []).filter(
            (f) =>
              f.type === 'blob' &&
              (f.path.endsWith('.md') || f.path.endsWith('.mdx')) &&
              (f.path.startsWith('docs/') || f.path.startsWith('content/docs/')),
          )

          if (mdFiles.length > 5) {
            return {
              strategy: 'github-raw-markdown',
              hasLlmsFull,
              llmsFullUrl,
              hasLlmsTxt,
              llmsTxtUrl,
              gitRepo: {
                owner,
                repo,
                branch: 'main',
                docsPath: mdFiles[0].path.startsWith('content/docs/') ? 'content/docs' : 'docs',
              },
            }
          }
        }
      }
    }
  } catch {}

  // 4. Tier 2: Probe direct .md endpoint (Mintlify / GitBook standard)
  try {
    const testPath = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : '/overview'
    const mdProbeUrl = `${origin}${testPath}.md`
    const mdRes = await fetch(mdProbeUrl, {
      headers: { 'User-Agent': 'agent-cache-bot' },
      signal: AbortSignal.timeout(4000),
    })

    const cType = mdRes.headers.get('content-type') || ''
    if (mdRes.ok && (cType.includes('text/markdown') || cType.includes('text/plain'))) {
      return {
        strategy: 'direct-raw-md',
        hasLlmsFull,
        llmsFullUrl,
        hasLlmsTxt,
        llmsTxtUrl,
        directMdSampleUrl: mdProbeUrl,
      }
    }
  } catch {}

  // 5. Tier 3: Fallback to HTML Purification
  return {
    strategy: 'html-purify',
    hasLlmsFull,
    llmsFullUrl,
    hasLlmsTxt,
    llmsTxtUrl,
    sitemapUrl: `${origin}/sitemap.xml`,
  }
}
