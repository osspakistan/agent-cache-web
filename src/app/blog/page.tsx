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

  return (
    <>
      <Nav active="blog" />
      <div class="wrap index-wrap">
        <main>
          <header class="index-head">
            <span class="section-label">blog</span>
            <h1>writing on docs for agents</h1>
            <p class="lede">
              Notes on extraction, documentation frameworks, and building docs a coding agent can
              actually read. Written in the open, as i build agent cache.
            </p>
          </header>

          <div>
            {posts.map((p) => {
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
                    <span class="item-tag">article</span>
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
