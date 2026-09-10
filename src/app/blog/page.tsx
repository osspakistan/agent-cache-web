import { Nav } from '../../components/nav'
import { getContent } from '../../lib/content'
import { setPageMeta } from '../../lib/page-meta'
import type { AppContext } from '../../lib/utils/types'

/**
 * GET /blog - list of all blog posts.
 * Reads content/blog/*.md via the content registry and renders a clean list.
 */
export const GET = async (_c: AppContext) => {
  const posts = await getContent('blog')

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
              actually read. Written in the open, as we build agent cache.
            </p>
          </header>
          <hr class="blog-list-sep" />
          <div>
            {posts.map((p) => (
              <a class="post-item" href={p.route} key={p.slug}>
                <h3>{p.title}</h3>
                {p.description && <p>{p.description}</p>}
                <span class="item-meta">{p.route}</span>
              </a>
            ))}
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
