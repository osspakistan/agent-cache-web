import type { AppContext } from '../../../lib/utils/types'

/**
 * GET /.well-known/api-catalog
 * RFC 9727 API Catalog with application/linkset+json content type.
 */
export const GET = (_c: AppContext) => {
  const catalog = {
    linkset: [
      {
        anchor: 'https://agentcache.run/api/jobs',
        'service-desc': [
          {
            href: 'https://agentcache.run/openapi.json',
            type: 'application/json',
          },
        ],
        'service-doc': [
          {
            href: 'https://agentcache.run/llms.txt',
            type: 'text/markdown',
          },
        ],
        status: [
          {
            href: 'https://agentcache.run/health',
          },
        ],
      },
      {
        anchor: 'https://agentcache.run/api/probe',
        'service-desc': [
          {
            href: 'https://agentcache.run/openapi.json',
            type: 'application/json',
          },
        ],
        'service-doc': [
          {
            href: 'https://agentcache.run/llms.txt',
            type: 'text/markdown',
          },
        ],
        status: [
          {
            href: 'https://agentcache.run/health',
          },
        ],
      },
      {
        anchor: 'https://agentcache.run/api',
        'service-desc': [
          {
            href: 'https://agentcache.run/.well-known/agent-card.json',
            type: 'application/json',
          },
        ],
        'service-doc': [
          {
            href: 'https://agentcache.run/llms.txt',
            type: 'text/markdown',
          },
        ],
      },
    ],
  }

  return new Response(JSON.stringify(catalog, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
