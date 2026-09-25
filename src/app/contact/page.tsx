import { Nav } from '../../components/nav'
import { setPageMeta } from '../../lib/page-meta'
import { createMarkdownResponse, prefersMarkdown } from '../../lib/utils/markdown-negotiation'
import type { AppContext } from '../../lib/utils/types'

export const GET = (c: AppContext) => {
  setPageMeta({
    title: 'Contact // Agent Cache',
    description:
      'Get in touch with Awais Alwaisy at Agent Cache. Report bugs, request features, or send feedback.',
    canonical: 'https://agentcache.run/contact',
  })

  // Markdown content negotiation
  if (prefersMarkdown(c)) {
    const md = `# Contact Agent Cache

Have questions, feedback, or need help? Here's how to reach me.

## Direct Email

You can reach me directly at [hello@agentcache.run](mailto:hello@agentcache.run).

## X / Social

- **X (Twitter)**: [@alvaisy](https://x.com/alvaisy)
- **GitHub**: [@alwaisy](https://github.com/alwaisy)
- **LinkedIn**: [alwaisy](https://www.linkedin.com/in/alwaisy/)

## GitHub Issues

For bug reports and docs crawler suggestions, feel free to open an issue on the [Agent Cache GitHub repository](https://github.com/agentcache/agent-cache).
`
    return createMarkdownResponse(md)
  }

  return c.html(
    <>
      <Nav active="contact" />
      <div class="wrap" style="padding:60px 20px;max-width:700px;">
        <h1>Contact</h1>
        <p class="lede">Have questions, feedback, or need help? Here's how to reach me.</p>

        <h2>Direct Email</h2>
        <p>
          Send an email directly to{' '}
          <a href="mailto:hello@agentcache.run" class="mono">
            hello@agentcache.run
          </a>
          .
        </p>

        <h2>X / Social</h2>
        <p>
          You can also reach me on X at{' '}
          <a href="https://x.com/alvaisy" target="_blank" rel="noopener">
            @alvaisy
          </a>
          , follow progress on{' '}
          <a href="https://github.com/alwaisy" target="_blank" rel="noopener">
            GitHub (@alwaisy)
          </a>
          , or connect on{' '}
          <a href="https://www.linkedin.com/in/alwaisy/" target="_blank" rel="noopener">
            LinkedIn
          </a>
          .
        </p>

        <h2>GitHub Issues</h2>
        <p>
          For bug reports or feature requests, feel free to open an issue on the{' '}
          <a href="https://github.com/agentcache/agent-cache" target="_blank" rel="noopener">
            GitHub repository
          </a>
          .
        </p>
      </div>
    </>,
  )
}
