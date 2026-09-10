import { BrandMark } from './brand-mark'

export function Nav(props: {
  active?: 'home' | 'docs' | 'about' | 'contact' | 'privacy' | 'dingdong' | 'blog' | 'compare'
}) {
  return (
    <header style="padding: 20px 0; border-bottom: 1px solid var(--border-soft); margin-bottom: 32px; view-transition-name: site-header;">
      <div class="wrap" style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <a
            href="/"
            style="display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--foreground);"
          >
            <BrandMark size="sm" px={22} />
            <span class="wordmark">agent-cache</span>
          </a>
          <nav style="display: flex; align-items: center; gap: 8px; margin-left: 16px;">
            <a
              href="/docs"
              class="mono"
              style={`font-size: 13px; text-decoration: none; padding: 6px 10px; border-radius: 6px; ${
                props.active === 'docs'
                  ? 'color: var(--foreground); font-weight: 600; background: var(--secondary);'
                  : 'color: var(--muted-foreground);'
              }`}
            >
              library
            </a>
            <a
              href="/blog"
              class="mono"
              style={`font-size: 13px; text-decoration: none; padding: 6px 10px; border-radius: 6px; ${props.active === 'blog' ? 'color: var(--foreground); font-weight: 600; background: var(--secondary);' : 'color: var(--muted-foreground);'}`}
            >
              blog
            </a>
            <a
              href="/compare"
              class="mono"
              style={`font-size: 13px; text-decoration: none; padding: 6px 10px; border-radius: 6px; ${props.active === 'compare' ? 'color: var(--foreground); font-weight: 600; background: var(--secondary);' : 'color: var(--muted-foreground);'}`}
            >
              compare
            </a>
          </nav>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <a
            href="/"
            class="mono"
            style="font-size: 12.5px; font-weight: 600; text-decoration: none; padding: 4px 14px; border-radius: 999px; border: 1px solid var(--primary); color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em;"
          >
            add docs
          </a>
          <button class="toggle" id="theme-toggle" type="button">
            theme
          </button>
        </div>
      </div>
    </header>
  )
}
