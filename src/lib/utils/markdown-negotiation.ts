const AI_AGENT_UAS = [
  'gptbot',
  'chatgpt-user',
  'claudebot',
  'claude-web',
  'anthropic-ai',
  'perplexitybot',
  'google-extended',
  'gemini',
  'deepseekbot',
  'ora-agent',
  'meta-externalagent',
  'bytespider',
  'amazonbot',
  'applebot-extended',
]

export function isAIAgentUA(ua = ''): boolean {
  const lower = ua.toLowerCase()
  return AI_AGENT_UAS.some((bot) => lower.includes(bot))
}

/**
 * Validates if the requested Accept header can be satisfied with HTML or Markdown.
 * Returns false if the client strictly demanded another content type (requires 406).
 */
export function isAcceptable(accept = ''): boolean {
  if (!accept || accept.trim() === '' || accept.includes('*/*')) return true
  return (
    accept.includes('text/html') || accept.includes('text/markdown') || accept.includes('text/*')
  )
}

/**
 * Markdown content negotiation helper.
 * Returns true if the client prefers markdown over HTML or is a known AI agent crawler.
 */
export function prefersMarkdown(c: {
  req: { header: (name: string) => string | undefined }
}): boolean {
  const accept = c.req.header('Accept') || ''
  const ua = c.req.header('User-Agent') || ''

  // If User-Agent is an AI Agent (e.g. GPTBot) and did not explicitly prioritize HTML
  if (isAIAgentUA(ua) && !accept.includes('text/html')) {
    return true
  }

  // Check if text/markdown is preferred over text/html
  const mdIndex = accept.indexOf('text/markdown')
  const htmlIndex = accept.indexOf('text/html')

  if (mdIndex === -1) return false
  if (htmlIndex === -1) return true
  return mdIndex < htmlIndex
}

/**
 * Returns standard Vary header for content-negotiated responses.
 */
export function contentNegotiationVary(): string {
  return 'Accept, Accept-Encoding'
}

/**
 * Estimates token count based on string length (~4 chars per token).
 */
export function estimateTokens(content: string): number {
  return Math.max(1, Math.ceil(content.length / 4))
}

/**
 * Standard headers for markdown twin responses per AEO / Dualmark Spec v1.0.
 */
export function markdownHeaders(content: string): Record<string, string> {
  return {
    'Content-Type': 'text/markdown; charset=utf-8',
    Vary: 'Accept, Accept-Encoding',
    'X-Robots-Tag': 'noindex',
    'X-AEO-Version': '1.0',
    'X-Markdown-Tokens': String(estimateTokens(content)),
  }
}

/**
 * Creates a standard AEO markdown Response.
 */
export function createMarkdownResponse(content: string, status = 200): Response {
  return new Response(content, {
    status,
    headers: markdownHeaders(content),
  })
}
