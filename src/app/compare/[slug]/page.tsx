import { raw } from 'hono/html'
import { Nav } from '../../../components/nav'
import { getPost } from '../../../lib/content'
import { setPageMeta } from '../../../lib/page-meta'
import type { AppContext } from '../../../lib/utils/types'

/**
 * GET /compare/[slug] - a single comparison, rendered from content/compare/*.md
 * via the content registry + comark HTML renderer.
 */
export const GET = async (c: AppContext) => {
  const slug = c.req.param('slug') || ''
  const post = await getPost('compare', slug)

  if (!post) {
    return (
      <>
        <Nav active="compare" />
        <div class="wrap" style="padding: 96px 20px; text-align: center;">
          <h1>Comparison not found.</h1>
          <p class="lede">
            No comparison at{' '}
            <span class="mono" style="color: var(--accent-ink);">
              /compare/{slug}
            </span>
            .
          </p>
          <a href="/compare" class="secondary" style="margin-top: 24px;">
            All comparisons →
          </a>
        </div>
      </>
    )
  }

  setPageMeta({
    title: `${post.metaTitle} // Agent Cache`,
    description: post.description,
    canonical: `https://agentcache.run${post.route}`,
  })

  return (
    <>
      <Nav active="compare" />
      <div class="wrap prose-wrap">
        <main>
          <a class="back-link" href="/compare">
            ← all comparisons
          </a>
          <article>
            <header class="post-head">
              <h1>{post.title}</h1>
              <p class="post-meta">honest comparison · agent cache</p>
            </header>
            <hr class="post-title-sep" />
            <div class="prose">{raw(post.html)}</div>
          </article>
        </main>
      </div>
    </>
  )
}
