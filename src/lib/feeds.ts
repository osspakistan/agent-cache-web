// RSS 2.0 feed builder shared by /feed.xml, /blog/feed.xml and /compare/feed.xml.
// Feeds are generated per request from the content registry, so they can never
// go stale the way a build-time file would.

import type { ContentPost } from './content'

export function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/** RFC 822 date from an optional **date:** meta line (YYYY-MM-DD or full). */
function rfc822(date: string | undefined): string | null {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toUTCString()
}

export interface FeedChannel {
  title: string
  link: string
  description: string
}

export function buildRssFeed(
  channel: FeedChannel,
  posts: ContentPost[],
  opts: { selfUrl: string; baseUrl: string },
): string {
  const items = posts
    .map((post) => {
      const url = `${opts.baseUrl}${post.route}`
      const pubDate = rfc822(post.date)
      return [
        '    <item>',
        `      <title>${xmlEscape(post.title)}</title>`,
        `      <link>${xmlEscape(url)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
        `      <description>${xmlEscape(post.description)}</description>`,
        ...(pubDate ? [`      <pubDate>${pubDate}</pubDate>`] : []),
        '    </item>',
      ].join('\n')
    })
    .join('\n')

  return (
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0">',
      '  <channel>',
      `    <title>${xmlEscape(channel.title)}</title>`,
      `    <link>${xmlEscape(channel.link)}</link>`,
      `    <description>${xmlEscape(channel.description)}</description>`,
      `    <atom:link href="${xmlEscape(opts.selfUrl)}" rel="self" type="application/rss+xml" />`,
      '  </channel>',
    ]
      .join('\n')
      // splice items before the closing channel tag (atom namespace declared on <rss>)
      .replace('  </channel>', `${items}\n  </channel>`)
      .replace(
        '<rss version="2.0">',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
      )
  )
}
