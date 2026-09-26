import { BrandMark } from './brand-mark'

export function Footer(props?: { wide?: boolean }) {
  return (
    <footer style="margin-top: 80px; border-top: 1px solid var(--border-soft); background: var(--secondary);">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .badge-theme-light { display: block; }
            .badge-theme-dark { display: none; }
            :root[data-theme="dark"] .badge-theme-light { display: none; }
            :root[data-theme="dark"] .badge-theme-dark { display: block; }
          `,
        }}
      />
      <div class={props?.wide ? 'wrap-wide' : 'wrap'} style="padding: 48px 0 32px;">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 48px; margin-bottom: 48px;">
          {/* product */}

          <div>
            <p
              class="mono"
              style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); margin-bottom: 16px;"
            >
              product
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">
              <li>
                <a
                  href="/"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  add docs
                </a>
              </li>
              <li>
                <a
                  href="/docs"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  library
                </a>
              </li>
            </ul>
          </div>

          {/* compare */}
          <div>
            <p
              class="mono"
              style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); margin-bottom: 16px;"
            >
              compare
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">
              <li>
                <a
                  href="/compare"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  all comparisons
                </a>
              </li>
              <li>
                <a
                  href="/compare/context7"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  vs context7
                </a>
              </li>
              <li>
                <a
                  href="/compare/firecrawl"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  vs firecrawl
                </a>
              </li>
              <li>
                <a
                  href="/compare/tavily"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  vs tavily
                </a>
              </li>
              <li>
                <a
                  href="/compare/content-dev"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  vs content.dev
                </a>
              </li>
              <li>
                <a
                  href="/compare/parallel-web"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  vs parallel web
                </a>
              </li>
              <li>
                <a
                  href="/compare/llms-txt"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  vs llms.txt
                </a>
              </li>
              <li>
                <a
                  href="/compare/docsgpt"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  vs docsgpt
                </a>
              </li>
              <li>
                <a
                  href="/compare/docuchat"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  vs docuchat
                </a>
              </li>
            </ul>
          </div>

          {/* resources */}
          <div>
            <p
              class="mono"
              style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); margin-bottom: 16px;"
            >
              resources
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">
              <li>
                <a
                  href="/blog"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  blog
                </a>
              </li>
              <li>
                <a
                  href="/blog/100-sites-extracted"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  100 sites extracted
                </a>
              </li>
              <li>
                <a
                  href="/blog/acquisition-ladder"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  acquisition ladder
                </a>
              </li>
              <li>
                <a
                  href="/blog/why-no-llm-extraction"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  why no llm
                </a>
              </li>
              <li>
                <a
                  href="/llms.txt"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  llms.txt
                </a>
              </li>
              <li>
                <a
                  href="/openapi.json"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  openapi
                </a>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  sitemap
                </a>
              </li>
            </ul>
          </div>

          {/* company */}
          <div>
            <p
              class="mono"
              style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); margin-bottom: 16px;"
            >
              company
            </p>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">
              <li>
                <a
                  href="/about"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  about
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  contact
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  privacy
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/agentcache/agent-cache"
                  class="mono"
                  style="font-size: 13px; color: var(--body); text-decoration: none;"
                >
                  github
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* badges row */}
        <div style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; padding-bottom: 28px; margin-bottom: 28px; border-bottom: 1px solid var(--border-soft);">
          <a
            href="https://www.listbulb.com/tools/agentcache"
            target="_blank"
            rel="noopener"
            style="display: inline-flex; align-items: center; text-decoration: none;"
          >
            <img
              class="badge-theme-light"
              src="https://www.listbulb.com/featured-on-listbulb-light.svg"
              alt="Featured on ListBulb"
              height="32"
              style="height: 32px; width: auto; max-height: 32px;"
            />
            <img
              class="badge-theme-dark"
              src="https://www.listbulb.com/featured-on-listbulb-dark.svg"
              alt="Featured on ListBulb"
              height="32"
              style="height: 32px; width: auto; max-height: 32px;"
            />
          </a>
          <a
            href="https://tools.launchllama.co/products/agent-cache?utm_source=badge&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
            style="display: inline-flex; align-items: center; text-decoration: none;"
          >
            <img
              class="badge-theme-light"
              src="https://tools.launchllama.co/featured-badge-white.jpg?v=5"
              alt="Featured on Launch Llama Tools"
              height="32"
              style="height: 32px; width: auto; max-height: 32px; border-radius: 4px;"
            />
            <img
              class="badge-theme-dark"
              src="https://tools.launchllama.co/featured-badge.png?v=2"
              alt="Featured on Launch Llama Tools"
              height="32"
              style="height: 32px; width: auto; max-height: 32px; border-radius: 4px;"
            />
          </a>
          <a
            href="https://launchon.it/products/agent-cache"
            target="_blank"
            rel="noopener"
            style="display: inline-flex; align-items: center; text-decoration: none;"
          >
            <img
              class="badge-theme-light"
              src="https://launchon.it/api/badge/agent-cache?theme=light&size=sm&type=featured"
              alt="Agent Cache on LaunchOn.it"
              height="32"
              style="height: 32px; width: auto; max-height: 32px;"
            />
            <img
              class="badge-theme-dark"
              src="https://launchon.it/api/badge/agent-cache?theme=dark&size=sm&type=featured"
              alt="Agent Cache on LaunchOn.it"
              height="32"
              style="height: 32px; width: auto; max-height: 32px;"
            />
          </a>
          <a
            href="https://codehype.ai/product/agent-cache?utm_source=codehype_badge"
            target="_blank"
            rel="noopener noreferrer"
            style="display: inline-flex; align-items: center; text-decoration: none;"
          >
            <img
              src="https://codehype.ai/badges/agent-cache.svg?variant=find-us&v=20"
              alt="Featured on CodeHype"
              height="32"
              loading="lazy"
              decoding="async"
              style="display: inline-block; border: 0; width: auto; height: 32px; max-height: 32px;"
            />
          </a>
        </div>

        {/* bottom bar */}
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 4px; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <BrandMark size="sm" px={20} />
            <span class="mono" style="font-size: 12px; color: var(--muted-foreground);">
              agent-cache. turn any docs into agent-ready markdown.
            </span>
          </div>
          <p class="mono" style="font-size: 12px; color: var(--muted-foreground); margin: 0;">
            (c) 2026 agent cache. mit license.
          </p>
        </div>
      </div>
    </footer>
  )
}
