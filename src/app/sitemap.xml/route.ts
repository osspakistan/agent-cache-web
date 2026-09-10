import { getContent } from '../../lib/content'
import type { AppContext } from '../../lib/utils/types'

/**
 * GET /sitemap.xml - XML sitemap
 * Lists all indexable URLs for search engines and agents.
 */
export const GET = async (_c: AppContext) => {
  const baseUrl = 'https://agentcache.run'
  const now = new Date().toISOString().split('T')[0]

  const blog = await getContent('blog')
  const compare = await getContent('compare')

  const staticUrls = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/docs', priority: '0.8', changefreq: 'daily' },
    { loc: '/blog', priority: '0.7', changefreq: 'weekly' },
    { loc: '/compare', priority: '0.7', changefreq: 'weekly' },
    { loc: '/about', priority: '0.6', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.5', changefreq: 'monthly' },
    { loc: '/privacy', priority: '0.4', changefreq: 'monthly' },
    { loc: '/health', priority: '0.3', changefreq: 'monthly' },
    { loc: '/llms.txt', priority: '0.7', changefreq: 'monthly' },
    { loc: '/openapi.json', priority: '0.7', changefreq: 'monthly' },
  ]

  const posts = [
    ...blog.map((p) => ({ loc: p.route, priority: '0.6', changefreq: 'monthly' })),
    ...compare.map((p) => ({ loc: p.route, priority: '0.6', changefreq: 'monthly' })),
  ]

  const urls = [...staticUrls, ...posts]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${baseUrl}${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
