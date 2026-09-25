import { Nav } from '../../components/nav'
import { setPageMeta } from '../../lib/page-meta'
import { createMarkdownResponse, prefersMarkdown } from '../../lib/utils/markdown-negotiation'
import type { AppContext } from '../../lib/utils/types'

export const GET = (c: AppContext) => {
  setPageMeta({
    title: 'Privacy Policy // Agent Cache',
    description:
      'Agent Cache privacy policy. Learn how we handle your data, what we collect, and your rights.',
    canonical: 'https://agentcache.run/privacy',
  })

  // Markdown content negotiation
  if (prefersMarkdown(c)) {
    const md = `# Privacy Policy

Last updated: September 2026

## Information We Collect

Agent Cache collects minimal data necessary to provide our service:

- **URLs you submit** - We process the documentation URLs you provide to crawl and convert them to markdown.
- **Job metadata** - We store job status, page count, and strategy used for each conversion.
- **Server logs** - Standard HTTP request logs for debugging and uptime monitoring.

## How We Use Your Information

We use the collected information solely to:

- Process your documentation conversion requests
- Provide access to completed bundles
- Improve service reliability and performance

## Data Storage

Processed documentation bundles are stored in Cloudflare R2 object storage. Job metadata is stored in a Turso (libSQL) database. We do not sell or share your data with third parties.

## Data Retention

Completed bundles are retained indefinitely to allow re-downloads. You can request deletion of your job data by contacting us.

## Third-Party Services

We use the following third-party services:

- **Cloudflare R2** - Object storage for processed bundles
- **Turso** - Database for job metadata

## Your Rights

You have the right to:

- Access your data
- Request deletion of your data
- Opt out of non-essential data collection

## Contact

For privacy-related inquiries, please contact us via our GitHub repository.
`
    return createMarkdownResponse(md)
  }

  return (
    <>
      <Nav active="privacy" />
      <div class="wrap" style="padding:60px 20px;max-width:700px;">
        <h1>Privacy Policy</h1>
        <p class="lede">Last updated: September 2026</p>

        <h2>Information We Collect</h2>
        <p>Agent Cache collects minimal data necessary to provide our service:</p>
        <ul>
          <li>
            <strong>URLs you submit</strong> — We process the documentation URLs you provide to
            crawl and convert them to markdown.
          </li>
          <li>
            <strong>Job metadata</strong> — We store job status, page count, and strategy used for
            each conversion.
          </li>
          <li>
            <strong>Server logs</strong> — Standard HTTP request logs for debugging and uptime
            monitoring.
          </li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use the collected information solely to:</p>
        <ul>
          <li>Process your documentation conversion requests</li>
          <li>Provide access to completed bundles</li>
          <li>Improve service reliability and performance</li>
        </ul>

        <h2>Data Storage</h2>
        <p>
          Processed documentation bundles are stored in Cloudflare R2 object storage. Job metadata
          is stored in a Turso (libSQL) database. We do not sell or share your data with third
          parties.
        </p>

        <h2>Data Retention</h2>
        <p>
          Completed bundles are retained indefinitely to allow re-downloads. You can request
          deletion of your job data by contacting us.
        </p>

        <h2>Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li>
            <strong>Cloudflare R2</strong> — Object storage for processed bundles
          </li>
          <li>
            <strong>Turso</strong> — Database for job metadata
          </li>
        </ul>

        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your data</li>
          <li>Request deletion of your data</li>
          <li>Opt out of non-essential data collection</li>
        </ul>

        <h2>Contact</h2>
        <p>For privacy-related inquiries, please contact us via our GitHub repository.</p>
      </div>
    </>
  )
}
