import { getContent } from '../../lib/content'
import { buildRssFeed } from '../../lib/feeds'
import type { AppContext } from '../../lib/utils/types'

/** GET /feed.xml - site-wide feed: blog posts and comparisons, newest section first. */
export const GET = async (_c: AppContext) => {
  const [blog, compare] = await Promise.all([getContent('blog'), getContent('compare')])
  const xml = buildRssFeed(
    {
      title: 'Agent Cache',
      link: 'https://agentcache.run',
      description:
        'Turn any documentation site into clean, agent-ready markdown docs. Writing and honest comparisons from a solo founder.',
    },
    [...blog, ...compare],
    { selfUrl: 'https://agentcache.run/feed.xml', baseUrl: 'https://agentcache.run' },
  )
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
