import { getContent } from '../../../lib/content'
import { buildRssFeed } from '../../../lib/feeds'
import type { AppContext } from '../../../lib/utils/types'

/** GET /blog/feed.xml - RSS feed for blog posts. */
export const GET = async (_c: AppContext) => {
  const posts = await getContent('blog')
  const xml = buildRssFeed(
    {
      title: 'Agent Cache blog',
      link: 'https://agentcache.run/blog',
      description:
        'Field notes on docs extraction, documentation frameworks, and building docs a coding agent can read.',
    },
    posts,
    { selfUrl: 'https://agentcache.run/blog/feed.xml', baseUrl: 'https://agentcache.run' },
  )
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
