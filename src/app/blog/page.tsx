import { Nav } from '../../components/nav'
import { getContent } from '../../lib/content'
import { setPageMeta } from '../../lib/page-meta'
import { createMarkdownResponse, prefersMarkdown } from '../../lib/utils/markdown-negotiation'
import type { AppContext } from '../../lib/utils/types'

/**
 * GET /blog - list of all blog posts.
 * Reads content/blog/*.md via the content registry and renders a clean list.
 */
export const GET = async (c: AppContext) => {
  const posts = await getContent('blog')

  if (prefersMarkdown(c)) {
    const list = posts
      .map((p) => `- [${p.title}](${p.route})${p.description ? ` — ${p.description}` : ''}`)
      .join('\n')
    const md = `# Agent Cache Blog

Writing on docs for agents, extraction mechanics, and building documentation that coding agents can actually read.

## Articles

${list}
`
    return createMarkdownResponse(md)
  }

  setPageMeta({
    title: 'Blog // Agent Cache',
    description:
      'Writing on documentation, extraction, and building docs that coding agents can actually read.',
    canonical: 'https://agentcache.run/blog',
  })

  const featured =
    posts.find((p) => p.slug.includes('100-docs') || p.slug.includes('100-sites')) || posts[0]
  const remainingPosts = posts.filter((p) => p.slug !== featured?.slug)

  // Categorize for instant client-side tabs
  const getCategory = (p: (typeof posts)[0]): string => {
    const s = `${p.slug} ${p.title} ${p.description}`.toLowerCase()
    if (
      s.includes('fail') ||
      s.includes('broke') ||
      s.includes('case-study') ||
      s.includes('100-sites') ||
      s.includes('100-docs')
    )
      return 'Autopsy'
    if (
      s.includes('mintlify') ||
      s.includes('docusaurus') ||
      s.includes('fumadocs') ||
      s.includes('framework')
    )
      return 'Frameworks'
    if (
      s.includes('ladder') ||
      s.includes('crawler') ||
      s.includes('html') ||
      s.includes('sitemap') ||
      s.includes('markdown')
    )
      return 'Extraction'
    if (
      s.includes('why-') ||
      s.includes('agent') ||
      s.includes('hallucination') ||
      s.includes('future')
    )
      return 'Philosophy'
    return 'Engineering'
  }

  const featuredWords = featured.body.split(/\s+/).length
  const featuredReadTime = Math.max(1, Math.ceil(featuredWords / 200))
  const featuredCategory = getCategory(featured)

  return (
    <>
      <Nav active="blog" />
      <div class="wrap index-wrap">
        <main>
          <header class="index-head">
            <span class="section-label">field notes</span>
            <h1>Writing on docs for agents</h1>
            <p class="lede">
              Notes on documentation crawlers, extraction mechanics, and building docs a coding
              agent can actually read. Written in the open, as I build Agent Cache.
            </p>
          </header>

          {/* Filter Pills */}
          <div class="filter-bar" id="blog-filters">
            <button type="button" class="filter-btn active" data-filter="all">
              All ({posts.length})
            </button>
            <button type="button" class="filter-btn" data-filter="Autopsy">
              Autopsies
            </button>
            <button type="button" class="filter-btn" data-filter="Extraction">
              Extraction
            </button>
            <button type="button" class="filter-btn" data-filter="Frameworks">
              Frameworks
            </button>
            <button type="button" class="filter-btn" data-filter="Philosophy">
              Agent AI
            </button>
            <button type="button" class="filter-btn" data-filter="Engineering">
              Engineering
            </button>
          </div>

          {/* Featured Card */}
          {featured && (
            <a class="featured-card" href={featured.route} data-category={featuredCategory}>
              <div class="featured-badge">★ Featured Investigation</div>
              <h2>{featured.title}</h2>
              {featured.description && <p>{featured.description}</p>}
              <div class="featured-meta">
                <span class="content-card-badge">{featuredCategory}</span>
                <span>•</span>
                <span>{featuredReadTime} min read</span>
                <span>•</span>
                <span style="color: var(--accent-ink); font-weight: 500;">Read case study →</span>
              </div>
            </a>
          )}

          {/* 2-Column Responsive Content Grid */}
          <div class="content-grid" id="blog-grid">
            {remainingPosts.map((p) => {
              const words = p.body.split(/\s+/).length
              const readTime = Math.max(1, Math.ceil(words / 200))
              const cat = getCategory(p)
              return (
                <a class="content-card" href={p.route} key={p.slug} data-category={cat}>
                  <div class="content-card-top">
                    <div class="content-card-badges">
                      <span class="content-card-badge">{cat}</span>
                    </div>
                    <h3>{p.title}</h3>
                    {p.description && <p>{p.description}</p>}
                  </div>
                  <div class="content-card-meta">
                    <span>{readTime} min read</span>
                    <span class="content-card-arrow">→</span>
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
                  const filterBar = document.getElementById('blog-filters');
                  if (!filterBar) return;
                  const buttons = filterBar.querySelectorAll('.filter-btn');
                  const cards = document.querySelectorAll('#blog-grid .content-card, .featured-card');

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
