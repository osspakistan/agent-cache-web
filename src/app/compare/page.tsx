import { Nav } from '../../components/nav'
import { getContent } from '../../lib/content'
import { setPageMeta } from '../../lib/page-meta'
import { createMarkdownResponse, prefersMarkdown } from '../../lib/utils/markdown-negotiation'
import type { AppContext } from '../../lib/utils/types'

/**
 * GET /compare - list of all comparison pages.
 * Reads content/compare/*.md via the content registry.
 */
export const GET = async (c: AppContext) => {
  const pages = await getContent('compare')

  if (prefersMarkdown(c)) {
    const list = pages
      .map((p) => `- [${p.title}](${p.route})${p.description ? ` — ${p.description}` : ''}`)
      .join('\n')
    const md = `# Agent Cache Comparisons

Honest comparisons of Agent Cache against alternatives (Context7, Firecrawl, Tavily, etc.).

## Comparisons

${list}
`
    return createMarkdownResponse(md)
  }

  setPageMeta({
    title: 'Compare // Agent Cache',
    description:
      'Honest comparisons of agent cache against context7, firecrawl, tavily, and other docs tooling. Where it wins, where it loses.',
    canonical: 'https://agentcache.run/compare',
  })

  return (
    <>
      <Nav active="compare" />
      <div class="wrap index-wrap">
        <main>
          <header class="index-head">
            <span class="section-label">compare</span>
            <h1>agent cache vs the alternatives</h1>
            <p class="lede">
              No fake "both are great" neutrality here. Each one is an honest comparison: where the
              other tool genuinely wins, where it's emptying your wallet, and whether you'd ever
              want both.
            </p>
          </header>

          <div>
            {pages.map((p) => {
              const targetTool = p.slug.replace(/^vs-/, '')
              const words = p.body.split(/\s+/).length
              const readTime = Math.max(1, Math.ceil(words / 200))
              return (
                <a class="post-item" href={p.route} key={p.slug}>
                  <h3>
                    <span>{p.title}</span>
                    <span class="item-arrow">→</span>
                  </h3>
                  {p.description && <p>{p.description}</p>}
                  <div class="item-meta">
                    <span class="item-tag">vs {targetTool}</span>
                    <span>•</span>
                    <span>{readTime} min read</span>
                  </div>
                </a>
              )
            })}
          </div>
        </main>
      </div>
      <footer class="manifesto" style="margin-top:64px;">
        <div class="wrap">
          <p class="thesis">Your agent is only as good as its docs.</p>
        </div>
      </footer>
    </>
  )
}
