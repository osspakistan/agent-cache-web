import type { AppContext } from '../../lib/utils/types'

// Design system colors (from public/tokens.css)
const light = {
  bg: '#fffcf4',
  fg: '#1e1e1e',
  body: '#545250',
  muted: '#777472',
  primary: '#5682cd',
  accent: '#3767b9',
  border: '#e4e1da',
}

const dark = {
  bg: '#1a1917',
  fg: '#f5f2e9',
  body: '#c4c0b8',
  muted: '#8d8a83',
  primary: '#7b9ee0',
  accent: '#8fb0e8',
  border: '#322f2b',
}

export const GET = async (c: AppContext) => {
  const sp = new URL(c.req.url).searchParams
  const t = sp.get('theme') === 'dark' ? dark : light
  const title = sp.get('title') || 'Agent Cache'
  const subtitle = sp.get('subtitle') || ''
  const pages = sp.get('pages')
  const source = sp.get('source') || ''
  const date = sp.get('date') || ''

  // compute x offset for footer items so they don't overlap
  const footerItems: string[] = []
  if (pages) footerItems.push(`<tspan fill="${t.primary}">●</tspan> ${esc(pages)} pages`)
  if (source) footerItems.push(esc(source))
  if (date) footerItems.push(esc(date))

  const footerEls = footerItems
    .map((item, i) => {
      const x = 56 + i * 160
      return `<text x="${x}" y="580" font-family="Inter, system-ui, sans-serif" font-size="18" fill="${t.muted}">${item}</text>`
    })
    .join('\n  ')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="11" cy="11" r="1" fill="${t.border}" opacity="0.5"/>
    </pattern>
  </defs>

  <!-- bg -->
  <rect width="1200" height="630" fill="${t.bg}"/>
  <rect width="1200" height="630" fill="url(#dots)"/>

  <!-- header: pills mark + wordmark -->
  <rect x="56" y="48" width="18" height="36" rx="9" fill="none" stroke="${t.fg}" stroke-width="2.5"/>
  <rect x="80" y="48" width="18" height="36" rx="9" fill="none" stroke="${t.accent}" stroke-width="2.5"/>
  <text x="112" y="74" font-family="IBM Plex Mono, monospace" font-size="22" font-weight="500" fill="${t.fg}">agent-cache</text>

  <!-- title -->
  <text x="56" y="340" font-family="Inter, system-ui, sans-serif" font-size="52" font-weight="600" fill="${t.fg}">${esc(title)}</text>

  <!-- subtitle -->
  ${subtitle ? `<text x="56" y="380" font-family="Inter, system-ui, sans-serif" font-size="24" fill="${t.body}">${esc(subtitle)}</text>` : ''}

  <!-- footer meta -->
  ${footerEls}
  </svg>`

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
