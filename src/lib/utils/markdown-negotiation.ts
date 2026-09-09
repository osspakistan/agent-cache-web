/**
 * Markdown content negotiation helper.
 * Returns true if the client prefers markdown over HTML.
 */
export function prefersMarkdown(c: { req: { header: (name: string) => string | undefined } }): boolean {
  const accept = c.req.header('Accept') || ''
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
