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

  const getCompareCategory = (p: (typeof pages)[0]): string => {
    const s = `${p.slug} ${p.title}`.toLowerCase()
    if (s.includes('firecrawl') || s.includes('parallel-web') || s.includes('crawl'))
      return 'Scrapers'
    if (s.includes('context7') || s.includes('content-dev') || s.includes('tavily'))
      return 'Context APIs'
    if (s.includes('docsgpt') || s.includes('docuchat') || s.includes('chat')) return 'Chat / RAG'
    if (s.includes('llms-txt')) return 'Standards'
    return 'Alternative'
  }

  return (
    <>
      <Nav active="compare" />
      <div class="wrap index-wrap">
        <main>
          <header class="index-head">
            <span class="section-label">benchmarks & alternatives</span>
            <h1>Agent Cache vs the alternatives</h1>
            <p class="lede">
              No fake "both are great" neutrality here. Each one is an honest comparison: where the
              other tool genuinely wins, where it's emptying your wallet, and whether you'd ever
              want both.
            </p>
          </header>

          {/* Filter Pills */}
          <div class="filter-bar" id="compare-filters">
            <button type="button" class="filter-btn active" data-filter="all">
              All ({pages.length})
            </button>
            <button type="button" class="filter-btn" data-filter="Scrapers">
              Scrapers
            </button>
            <button type="button" class="filter-btn" data-filter="Context APIs">
              Context APIs
            </button>
            <button type="button" class="filter-btn" data-filter="Chat / RAG">
              Chat / RAG
            </button>
            <button type="button" class="filter-btn" data-filter="Standards">
              Standards
            </button>
          </div>

          {/* 2-Column Responsive Content Grid */}
          <div class="content-grid" id="compare-grid">
            {pages.map((p) => {
              const targetTool = p.slug.replace(/^vs-/, '').replace(/\/compare\//, '')
              const words = p.body.split(/\s+/).length
              const readTime = Math.max(1, Math.ceil(words / 200))
              const cat = getCompareCategory(p)
              return (
                <a class="content-card" href={p.route} key={p.slug} data-category={cat}>
                  <div class="content-card-top">
                    <div class="content-card-badges">
                      <span class="content-card-badge">vs {targetTool}</span>
                      <span
                        class="content-card-badge"
                        style="background: var(--background); color: var(--ink-soft);"
                      >
                        {cat}
                      </span>
                    </div>
                    <h3>{p.title}</h3>
                    {p.description && <p>{p.description}</p>}
                  </div>
                  <div class="content-card-meta">
                    <span>{readTime} min read</span>
                    <span class="content-card-arrow">Read breakdown →</span>
                  </div>
                </a>
              )
            })}
          </div>

          {/* Filter Script */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  const filterBar = document.getElementById('compare-filters');
                  if (!filterBar) return;
                  const buttons = filterBar.querySelectorAll('.filter-btn');
                  const cards = document.querySelectorAll('#compare-grid .content-card');

                  buttons.forEach(btn => {
                    btn.addEventListener('click', () => {
                      buttons.forEach(b => b.classList.remove('active'));
                      btn.classList.add('active');
                      const filter = btn.dataset.filter;

                      cards.forEach(card => {
                        if (filter === 'all' || card.dataset.category === filter) {
                          card.style.display = '';
                        } else {
                          card.style.display = 'none';
                        }
                      });
                    });
                  });
                })();
              `,
            }}
          />
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
