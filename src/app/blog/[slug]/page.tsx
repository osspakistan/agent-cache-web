import { raw } from 'hono/html'
import { Nav } from '../../../components/nav'
import { getPost } from '../../../lib/content'
import { setPageMeta } from '../../../lib/page-meta'
import type { AppContext } from '../../../lib/utils/types'

/**
 * GET /blog/[slug] - a single blog post, rendered from content/blog/*.md
 * via the content registry + comark HTML renderer.
 */
export const GET = async (c: AppContext) => {
  const slug = c.req.param('slug') || ''
  const post = await getPost('blog', slug)

  if (!post) {
    return (
      <>
        <Nav active="blog" />
        <div class="wrap" style="padding: 96px 20px; text-align: center;">
          <h1>Post not found.</h1>
          <p class="lede">
            No blog post at{' '}
            <span class="mono" style="color: var(--accent-ink);">
              /blog/{slug}
            </span>
            .
          </p>
          <a href="/blog" class="secondary" style="margin-top: 24px;">
            Back to the blog →
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
      <Nav active="blog" />
      <div class="wrap prose-wrap">
        <main>
          <a class="back-link" href="/blog">
            ← all posts
          </a>
          <article>
            <header class="post-head">
              <h1>{post.title}</h1>
              <p class="post-meta">agent cache · field notes</p>
            </header>
            <hr class="post-title-sep" />
            <div class="prose">{raw(post.html)}</div>
          </article>
        </main>
      </div>
    </>
  )
}
