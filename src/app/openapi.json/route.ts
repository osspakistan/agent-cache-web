import type { AppContext } from '../../lib/utils/types'

/**
 * GET /openapi.json - OpenAPI 3.0 specification
 * Describes the Agent Cache API surface for AI agents.
 */
export const GET = (c: AppContext) => {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Agent Cache API',
      description:
        'Turn any documentation site into clean, agent-ready markdown docs. Paste a docs URL, get the whole site back as plain markdown files a coding agent can read.',
      version: '1.0.0',
      contact: {
        name: 'Agent Cache',
        url: 'https://agentcache.run',
      },
      license: {
        name: 'MIT',
        url: 'https://github.com/agentcache/agent-cache/blob/main/LICENSE',
      },
    },
    servers: [{ url: 'https://agentcache.run', description: 'Production' }],
    paths: {
      '/health': {
        get: {
          operationId: 'getHealth',
          summary: 'Health check',
          description:
            'Returns service uptime status. Used by monitoring and agents to verify availability.',
          tags: ['System'],
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean', example: true },
                      service: { type: 'string', example: 'agent-cache-web' },
                      ts: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/jobs': {
        post: {
          operationId: 'createJob',
          summary: 'Submit a new crawl job',
          description:
            'Submit a documentation URL for processing. The site is crawled, converted to clean markdown, and packaged as a ZIP bundle. Returns immediately with a job ID; poll GET /api/jobs/{id} for status.',
          tags: ['Jobs'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url'],
                  properties: {
                    url: {
                      type: 'string',
                      description: 'Documentation URL to process (e.g. https://docs.example.com)',
                      example: 'https://hono.dev',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Job created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      job: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'ac-4k9z1m8x' },
                          status: { type: 'string', example: 'pending' },
                          input_url: { type: 'string' },
                          r2_prefix: { type: 'string' },
                          created_at: { type: 'integer' },
                        },
                      },
                      links: {
                        type: 'object',
                        properties: {
                          status: { type: 'string' },
                          tree: { type: 'string' },
                          logs: { type: 'string' },
                          stream: { type: 'string' },
                          viewer: { type: 'string' },
                          download: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        get: {
          operationId: 'listJobs',
          summary: 'List completed jobs',
          description: 'Returns a list of recently completed doc bundles.',
          tags: ['Jobs'],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              description: 'Maximum number of results',
              schema: { type: 'integer', default: 20, maximum: 100 },
            },
          ],
          responses: {
            '200': {
              description: 'List of completed jobs',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      jobs: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/JobSummary' },
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/jobs/{id}': {
        get: {
          operationId: 'getJob',
          summary: 'Get job details',
          description: 'Returns the status and details of a specific job.',
          tags: ['Jobs'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Job ID',
              schema: { type: 'string', example: 'ac-4k9z1m8x' },
            },
          ],
          responses: {
            '200': {
              description: 'Job details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      job: { $ref: '#/components/schemas/JobDetail' },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Job not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/jobs/{id}/tree': {
        get: {
          operationId: 'getJobTree',
          summary: 'Get job navigation tree',
          description: 'Returns the navigation tree/extracted structure of a completed job.',
          tags: ['Jobs'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Job ID',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Job tree structure',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      job_id: { type: 'string' },
                      tree: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          tabs: { type: 'array', items: { type: 'string' } },
                          sections: { type: 'array' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Job not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/probe': {
        post: {
          operationId: 'probeUrl',
          summary: 'Probe a documentation URL',
          description:
            'Tests the acquisition strategy for a URL without starting a full job. Returns the detected strategy and available endpoints.',
          tags: ['Probe'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url'],
                  properties: {
                    url: {
                      type: 'string',
                      description: 'Documentation URL to probe',
                      example: 'https://hono.dev',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Probe results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      input_url: { type: 'string' },
                      canonical_url: { type: 'string' },
                      product_name: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      logo_url: { type: 'string' },
                      strategy: { type: 'string' },
                      has_llms_txt: { type: 'boolean' },
                      llms_txt_url: { type: 'string' },
                      has_llms_full: { type: 'boolean' },
                      llms_full_url: { type: 'string' },
                      direct_md_sample_url: { type: 'string' },
                      git_repo: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: false },
            error: { type: 'string', description: 'Human-readable error message' },
            code: { type: 'string', description: 'Machine-readable error code' },
          },
        },
        JobSummary: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'probing', 'crawling', 'packaging', 'complete', 'failed'],
            },
            input_url: { type: 'string' },
            resolved_url: { type: 'string' },
            product_name: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            logo_url: { type: 'string' },
            strategy: { type: 'string' },
            page_count: { type: 'integer' },
            zip_size_bytes: { type: 'integer' },
            created_at: { type: 'integer' },
            completed_at: { type: 'integer' },
            links: {
              type: 'object',
              properties: {
                viewer: { type: 'string' },
                download: { type: 'string' },
                tree: { type: 'string' },
              },
            },
          },
        },
        JobDetail: {
          allOf: [
            { $ref: '#/components/schemas/JobSummary' },
            {
              type: 'object',
              properties: {
                error_machine: { type: 'string' },
                error_human: { type: 'string' },
                r2_prefix: { type: 'string' },
              },
            },
          ],
        },
      },
    },
  }

  return c.json(spec)
}
