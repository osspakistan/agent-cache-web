import { Footer } from '../../components/footer'
import { Nav } from '../../components/nav'
import { setPageMeta } from '../../lib/page-meta'
import { contentNegotiationVary, prefersMarkdown } from '../../lib/utils/markdown-negotiation'
import type { AppContext } from '../../lib/utils/types'

export const GET = (c: AppContext) => {
  setPageMeta({
    title: 'Contact // Agent Cache',
    description:
      'Get in touch with the Agent Cache team. Report bugs, request features, or ask questions about the service.',
    canonical: 'https://agentcache.run/contact',
  })

  // Markdown content negotiation
  if (prefersMarkdown(c)) {
    const md = `# Contact Agent Cache

Have questions, feedback, or need help? Here's how to reach us.

## GitHub Issues

For bug reports and feature requests, please open an issue on our GitHub repository. This helps us track and prioritize improvements.

## Email

For general inquiries, you can reach us via email. Check our GitHub repository for the latest contact information.

## Response Time

We aim to respond to all inquiries within 2-3 business days. For urgent issues, please note this in your message subject.
`
    return c.text(md, 200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: contentNegotiationVary(),
    })
  }

  return c.html(
    <>
      <Nav active="contact" />
      <div class="wrap" style="padding:60px 20px;max-width:700px;">
        <h1>Contact</h1>
        <p class="lede">Have questions, feedback, or need help? Here's how to reach us.</p>

        <h2>GitHub Issues</h2>
        <p>
          For bug reports and feature requests, please open an issue on our GitHub repository. This
          helps us track and prioritize improvements.
        </p>

        <h2>Email</h2>
        <p>
          For general inquiries, you can reach us via email. Check our GitHub repository for the
          latest contact information.
        </p>

        <h2>Response Time</h2>
        <p>
          We aim to respond to all inquiries within 2-3 business days. For urgent issues, please
          note this in your message subject.
        </p>
      </div>
      <Footer />
    </>,
  )
}
