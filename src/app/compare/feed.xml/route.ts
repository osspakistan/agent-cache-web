import { getContent } from '../../../lib/content'
import { buildRssFeed } from '../../../lib/feeds'
import type { AppContext } from '../../../lib/utils/types'

/** GET /compare/feed.xml - RSS feed for comparison pages. */
export const GET = async (_c: AppContext) => {
  const posts = await getContent('compare')
  const xml = buildRssFeed(
    {
      title: 'Agent Cache comparisons',
      link: 'https://agentcache.run/compare',
      description:
        'Honest comparisons of agent cache against context7, firecrawl, tavily, and other docs tooling.',
    },
    posts,
    { selfUrl: 'https://agentcache.run/compare/feed.xml', baseUrl: 'https://agentcache.run' },
  )
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
