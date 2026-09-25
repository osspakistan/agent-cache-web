import { getContent } from '../../lib/content'
import type { AppContext } from '../../lib/utils/types'

const BASE = 'https://agentcache.run'

/**
 * GET /llms-full.txt - every article's full markdown body in one file, so an
 * agent can ingest the entire site's writing in a single request.
 */
export const GET = async (_c: AppContext) => {
  const [blog, compare] = await Promise.all([getContent('blog'), getContent('compare')])

  const section = (_title: string, posts: typeof blog) =>
    posts
      .map(
        (p) =>
          `<!-- ${BASE}${p.route} -->\n\n# ${p.title}\n\n> ${p.description}\n\n${p.body}\n\n---\n`,
      )
      .join('\n')

  const md = `# Agent Cache: full writing index

> Complete text of every blog post and comparison on ${BASE}. Generated live from the content registry.

## Blog posts (${blog.length})

${section('blog', blog)}

## Comparisons (${compare.length})

${section('compare', compare)}
`

  return new Response(md, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
