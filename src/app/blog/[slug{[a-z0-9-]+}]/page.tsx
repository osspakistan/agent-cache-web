import { raw } from 'hono/html'
import { Nav } from '../../../components/nav'
import { getPost } from '../../../lib/content'
import { setPageMeta } from '../../../lib/page-meta'
import { createMarkdownResponse, prefersMarkdown } from '../../../lib/utils/markdown-negotiation'
import type { AppContext } from '../../../lib/utils/types'

/**
 * GET /blog/[slug] - a single blog post, rendered from content/blog/*.md
 * via the content registry + comark HTML renderer.
 */
export const GET = async (c: AppContext) => {
  const rawSlug = c.req.param('slug') || ''
  const slug = rawSlug.replace(/\.md$/, '')
  const post = await getPost('blog', slug)

  if (!post) return c.notFound()

  if (slug !== post.slug) {
    return c.redirect(`${post.route}${new URL(c.req.url).search}`, 301)
  }

  if (prefersMarkdown(c)) {
    const md = `# ${post.title}

${post.description ? `> ${post.description}\n\n` : ''}${post.body}
`
    return createMarkdownResponse(md)
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
