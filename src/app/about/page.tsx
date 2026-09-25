import { Nav } from '../../components/nav'
import { setPageMeta } from '../../lib/page-meta'
import { createMarkdownResponse, prefersMarkdown } from '../../lib/utils/markdown-negotiation'
import type { AppContext } from '../../lib/utils/types'

export const GET = (c: AppContext) => {
  setPageMeta({
    title: 'About // Agent Cache',
    description:
      'Agent Cache turns any documentation site into clean, agent-ready markdown docs. Built by Awais Alwaisy.',
    canonical: 'https://agentcache.run/about',
  })

  // Markdown content negotiation
  if (prefersMarkdown(c)) {
    const md = `# About Agent Cache

Agent Cache turns any documentation site into clean, agent-ready markdown docs. Paste a docs URL, get the whole site back as plain markdown files your coding agents can read.

## The Mission

I built Agent Cache because I believe coding agents (Claude Code, Cursor, Codex, Windsurf) should have access to complete, accurate documentation for any library or API you are integrating with. Too often, agents hallucinate outdated APIs because the docs are trapped behind dynamic JavaScript UIs, paywalls, or aren't in their context.

I designed Agent Cache to convert any documentation site into a clean, deterministic artifact: plain markdown files, a navigation tree, and metadata. Drop it into your repo, and your agent has the entire docs offline.

## How It Works

The pipeline follows a cost-ordered acquisition ladder:

1. **Direct .md endpoints** - Many modern doc stacks (Mintlify, Fumadocs, Docusaurus) expose raw markdown. I check for these first.
2. **GitHub raw markdown** - If the docs are open source, I fetch the markdown files directly from the repository.
3. **HTML purification** - As a fallback, I crawl the HTML and extract clean markdown using Turndown.

No LLM is used in the pipeline. Structure is derived deterministically from URL topology (path hierarchy, sitemap, nav links, breadcrumbs). Same input, same output.

## The Builder

Agent Cache is built by **Awais Alwaisy** — a developer, tech writer, and tool builder focused on TypeScript, modern web tooling, and developer experience for the agentic coding era.

- **X (Twitter)**: [@alvaisy](https://x.com/alvaisy)
- **GitHub**: [@alwaisy](https://github.com/alwaisy)
- **LinkedIn**: [alwaisy](https://www.linkedin.com/in/alwaisy/)
- **Email**: [hello@agentcache.run](mailto:hello@agentcache.run)

## Open Source

Agent Cache is open source (MIT license). The web app, CLI, and MCP server are all available on GitHub. Self-host it or use the managed service.

## Contact

Have questions, ideas, or feedback? Reach out directly via email at [hello@agentcache.run](mailto:hello@agentcache.run), message me on [X (@alvaisy)](https://x.com/alvaisy), or [open an issue on GitHub](https://github.com/agentcache/agent-cache).
`
    return createMarkdownResponse(md)
  }

  return (
    <>
      <Nav active="about" />
      <div class="wrap" style="padding:60px 20px;max-width:700px;">
        <h1>About Agent Cache</h1>
        <p class="lede">
          Agent Cache turns any documentation site into clean, agent-ready markdown docs. Paste a
          docs URL, get the whole site back as plain markdown files a coding agent can read.
        </p>

        <h2>The Mission</h2>
        <p>
          I built Agent Cache because I believe coding agents (Claude Code, Cursor, Codex, Windsurf)
          should have access to complete, accurate documentation for any API you're integrating
          with. Too often, agents hallucinate outdated APIs because the docs aren't in their
          context.
        </p>
        <p>
          I designed Agent Cache to solve this by converting any documentation site into a clean,
          deterministic artifact: plain markdown files, a navigation tree, and metadata. Drop it
          into your repo, and your agent has the full docs offline.
        </p>

        <h2>How It Works</h2>
        <p>The pipeline follows a cost-ordered acquisition ladder:</p>
        <ol>
          <li>
            <strong>Direct .md endpoints</strong> — Many modern doc stacks (Mintlify, Fumadocs,
            Docusaurus) expose raw markdown. I check for these first.
          </li>
          <li>
            <strong>GitHub raw markdown</strong> — If the docs are open source, I fetch the markdown
            files directly from the repository.
          </li>
          <li>
            <strong>HTML purification</strong> — As a fallback, I crawl the HTML and convert it to
            clean markdown using Turndown.
          </li>
        </ol>
        <p>
          No LLM is used in the crawling pipeline. Structure comes from URL topology (path
          hierarchy, sitemap, nav links, breadcrumbs). Output is deterministic: same input, same
          output.
        </p>

        <h2>The Builder</h2>
        <p>
          Agent Cache is built by <strong>Awais Alwaisy</strong> — a developer, tech writer, and
          software craftsman focused on TypeScript, modern web tooling, and developer experience in
          the agentic AI era.
        </p>

        <div
          style="
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 18px 20px;
            margin: 20px 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
          "
        >
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="mono" style="font-size: 12px; color: var(--ink-soft); width: 80px;">
              X:
            </span>
            <a
              href="https://x.com/alvaisy"
              target="_blank"
              rel="noopener"
              class="mono"
              style="font-size: 13px; color: var(--accent-ink); text-decoration: underline;"
            >
              @alvaisy
            </a>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="mono" style="font-size: 12px; color: var(--ink-soft); width: 80px;">
              GitHub:
            </span>
            <a
              href="https://github.com/alwaisy"
              target="_blank"
              rel="noopener"
              class="mono"
              style="font-size: 13px; color: var(--accent-ink); text-decoration: underline;"
            >
              @alwaisy
            </a>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="mono" style="font-size: 12px; color: var(--ink-soft); width: 80px;">
              LinkedIn:
            </span>
            <a
              href="https://www.linkedin.com/in/alwaisy/"
              target="_blank"
              rel="noopener"
              class="mono"
              style="font-size: 13px; color: var(--accent-ink); text-decoration: underline;"
            >
              in/alwaisy
            </a>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="mono" style="font-size: 12px; color: var(--ink-soft); width: 80px;">
              Email:
            </span>
            <a
              href="mailto:hello@agentcache.run"
              class="mono"
              style="font-size: 13px; color: var(--accent-ink); text-decoration: underline;"
            >
              hello@agentcache.run
            </a>
          </div>
        </div>

        <h2>Open Source</h2>
        <p>
          Agent Cache is open source (MIT license). The web app, CLI, and MCP server are all
          available on GitHub. Self-host it or use the managed service.
        </p>

        <h2>Contact</h2>
        <p>
          Have questions or feedback? Email me at{' '}
          <a href="mailto:hello@agentcache.run">hello@agentcache.run</a>, reach out on{' '}
          <a href="https://x.com/alvaisy" target="_blank" rel="noopener">
            X (@alvaisy)
          </a>
          , or check <a href="/contact">the contact page</a>.
        </p>
      </div>
    </>
  )
}
