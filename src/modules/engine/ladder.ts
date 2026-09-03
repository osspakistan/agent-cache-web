import type { StrategyType } from '../../shared/types'

export interface LadderDecision {
  strategy: StrategyType
  llmsUrl?: string
  gitRepo?: { owner: string; repo: string; branch: string; docsPath: string }
  directMdSampleUrl?: string
  sitemapUrl?: string
}

export async function probeAcquisitionLadder(docsUrl: string): Promise<LadderDecision> {
  const url = new URL(docsUrl)
  const origin = url.origin

  // 1. Tier 1: Check llms-full.txt or llms.txt
  try {
    const checkLlms = await fetch(`${origin}/llms-full.txt`, {
      method: 'GET',
      headers: { 'User-Agent': 'agent-cache-probe/1.0' },
      signal: AbortSignal.timeout(4000),
    })
    if (checkLlms.ok && (checkLlms.headers.get('content-type') || '').includes('text')) {
      return {
        strategy: 'llms-txt',
        llmsUrl: `${origin}/llms-full.txt`,
      }
    }
  } catch {}

  // 2. Tier 2: Check Open-Source GitHub repository in page footer/navbar
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
          const treeData: any = await treeRes.json()
          const mdFiles = (treeData.tree || []).filter(
            (f: any) =>
              f.type === 'blob' &&
              (f.path.endsWith('.md') || f.path.endsWith('.mdx')) &&
              (f.path.startsWith('docs/') || f.path.startsWith('content/docs/')),
          )

          if (mdFiles.length > 5) {
            return {
              strategy: 'github-raw-markdown',
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

  // 3. Tier 3: Probe direct .md endpoint (Mintlify / GitBook standard)
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
        directMdSampleUrl: mdProbeUrl,
      }
    }
  } catch {}

  // 4. Tier 4: Fallback to HTML Purification
  return {
    strategy: 'html-purify',
    sitemapUrl: `${origin}/sitemap.xml`,
  }
}
