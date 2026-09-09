import { Nav } from '../../components/nav'
import { Footer } from '../../components/footer'
import { setPageMeta } from '../../lib/page-meta'
import { prefersMarkdown, contentNegotiationVary } from '../../lib/utils/markdown-negotiation'
import type { AppContext } from '../../lib/utils/types'

export const GET = (c: AppContext) => {
  setPageMeta({
    title: 'About // Agent Cache',
    description:
      'Agent Cache turns any documentation site into clean, agent-ready markdown docs. Learn about our mission, how we work, and why we built this.',
    canonical: 'https://agentcache.run/about',
  })

  // Markdown content negotiation
  if (prefersMarkdown(c)) {
    const md = `# About Agent Cache

Agent Cache turns any documentation site into clean, agent-ready markdown docs. Paste a docs URL, get the whole site back as plain markdown files a coding agent can read.

## Our Mission

We believe coding agents (Claude Code, Cursor, Codex, Windsurf) should have access to complete, accurate documentation for any API they're integrating with. Too often, agents hallucinate outdated APIs because the docs aren't in their context.

Agent Cache solves this by converting any documentation site into a clean, deterministic artifact: plain markdown files, a navigation map, and metadata. Drop it in your repo, and your agent has the full docs offline.

## How It Works

Our pipeline follows a cost-ordered acquisition ladder:

1. **Direct .md endpoints** - Many modern doc stacks (Mintlify, Fumadocs, Docusaurus) expose raw markdown. We try this first.
2. **GitHub raw markdown** - If the docs are open source, we fetch the .md files directly from the repo.
3. **HTML purification** - As a last resort, we crawl the HTML and convert to clean markdown using Turndown.

No LLM is used in the pipeline. Structure comes from URL topology (path hierarchy, sitemap, nav links, breadcrumbs). Output is deterministic: same input, same output.

## Open Source

Agent Cache is open source (MIT license). The web app, CLI, and MCP server are all available on GitHub. Self-host or use our managed service.

## Contact

Have questions or feedback? Reach out via [our contact page](https://agentcache.run/contact) or open an issue on GitHub.
`
    return c.text(md, 200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': contentNegotiationVary(),
    })
  }

  return c.html(
    <>
      <Nav active="about" />
      <div class="wrap" style="padding:60px 20px;max-width:700px;">
        <h1>About Agent Cache</h1>
        <p class="lede">
          Agent Cache turns any documentation site into clean, agent-ready markdown docs. Paste a
          docs URL, get the whole site back as plain markdown files a coding agent can read.
        </p>

        <h2>Our Mission</h2>
        <p>
          We believe coding agents (Claude Code, Cursor, Codex, Windsurf) should have access to
          complete, accurate documentation for any API they're integrating with. Too often, agents
          hallucinate outdated APIs because the docs aren't in their context.
        </p>
        <p>
          Agent Cache solves this by converting any documentation site into a clean, deterministic
          artifact: plain markdown files, a navigation map, and metadata. Drop it in your repo, and
          your agent has the full docs offline.
        </p>

        <h2>How It Works</h2>
        <p>Our pipeline follows a cost-ordered acquisition ladder:</p>
        <ol>
          <li>
            <strong>Direct .md endpoints</strong> — Many modern doc stacks (Mintlify, Fumadocs,
            Docusaurus) expose raw markdown. We try this first.
          </li>
          <li>
            <strong>GitHub raw markdown</strong> — If the docs are open source, we fetch the .md
            files directly from the repo.
          </li>
          <li>
            <strong>HTML purification</strong> — As a last resort, we crawl the HTML and convert to
            clean markdown using Turndown.
          </li>
        </ol>
        <p>
          No LLM is used in the pipeline. Structure comes from URL topology (path hierarchy,
          sitemap, nav links, breadcrumbs). Output is deterministic: same input, same output.
        </p>

        <h2>Open Source</h2>
        <p>
          Agent Cache is open source (MIT license). The web app, CLI, and MCP server are all
          available on GitHub. Self-host or use our managed service.
        </p>

        <h2>Contact</h2>
        <p>
          Have questions or feedback? Reach out via{' '}
          <a href="/contact">our contact page</a> or open an issue on GitHub.
        </p>
      </div>
      <Footer />
    </>,
  )
}
