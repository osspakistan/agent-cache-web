import { BrandMark } from './brand-mark'

export function Nav(props: { active?: 'home' | 'docs' | 'about' | 'contact' | 'privacy' | 'dingdong' }) {
  return (
    <header style="padding: 20px 0; border-bottom: 1px solid var(--border-soft); margin-bottom: 32px; view-transition-name: site-header;">
      <div class="wrap" style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <a
            href="/"
            style="display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--ink);"
          >
            <BrandMark size="sm" px={22} />
            <span class="wordmark">agent-cache</span>
          </a>
          <nav style="display: flex; align-items: center; gap: 12px; margin-left: 12px;">
            <a
              href="/"
              class="mono"
              style={`font-size: 13px; text-decoration: none; padding: 4px 8px; border-radius: 4px; ${
                props.active === 'home'
                  ? 'color: var(--ink); font-weight: 600; background: var(--secondary);'
                  : 'color: var(--ink-soft);'
              }`}
            >
              add
            </a>
            <a
              href="/docs"
              class="mono"
              style={`font-size: 13px; text-decoration: none; padding: 4px 8px; border-radius: 4px; ${
                props.active === 'docs'
                  ? 'color: var(--ink); font-weight: 600; background: var(--secondary);'
                  : 'color: var(--ink-soft);'
              }`}
            >
              library
            </a>
            <a
              href="/about"
              class="mono"
              style={`font-size: 13px; text-decoration: none; padding: 4px 8px; border-radius: 4px; ${
                props.active === 'about'
                  ? 'color: var(--ink); font-weight: 600; background: var(--secondary);'
                  : 'color: var(--ink-soft);'
              }`}
            >
              about
            </a>
            <a
              href="/contact"
              class="mono"
              style={`font-size: 13px; text-decoration: none; padding: 4px 8px; border-radius: 4px; ${
                props.active === 'contact'
                  ? 'color: var(--ink); font-weight: 600; background: var(--secondary);'
                  : 'color: var(--ink-soft);'
              }`}
            >
              contact
            </a>
          </nav>
        </div>

        <button class="toggle" id="theme-toggle" type="button">
          theme
        </button>
      </div>
    </header>
  )
}
