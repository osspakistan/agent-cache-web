/**
 * BrandMark — the agent-cache mark, inlined as SVG.
 *
 * Inlined rather than <img src> because an SVG loaded through <img> is an isolated
 * document: it cannot see the page's CSS vars, so it cannot follow the theme toggle.
 * Inline, mode="auto" inherits currentColor and var(--accent) and flips with the theme.
 *
 * Standalone files live in public/: logo-{sm,md,hq}-{light,dark}.svg (see brand.json).
 *
 *   <BrandMark size="sm" px={22} />               header bar
 *   <BrandMark size="hq" px={88} mode="dark" />   footer, on the dark slab
 */

type Size = 'sm' | 'md' | 'hq'
type Mode = 'auto' | 'light' | 'dark'

// size class → viewBox geometry. Same drawing in all three; only stroke weight
// relative to the canvas differs (heavier stroke relative to canvas the smaller
// the class, so the mark holds up at small sizes).
const GEOMETRY = {
  sm: { vb: 32, w: 14, h: 24, rx: 7, y: 4, x1: 3, x2: 15, stroke: 3 },
  md: { vb: 64, w: 28, h: 48, rx: 14, y: 8, x1: 6, x2: 30, stroke: 5 },
  hq: { vb: 256, w: 112, h: 192, rx: 56, y: 32, x1: 24, x2: 120, stroke: 16 },
} as const

const COLORS = {
  auto: { ink: 'currentColor', acc: 'var(--accent, #3767b9)' },
  light: { ink: '#1e1e1e', acc: '#3767b9' },
  dark: { ink: '#f5f2e9', acc: '#8fb0e8' },
} as const

export function BrandMark(props: {
  size?: Size
  mode?: Mode
  px?: number
  class?: string
  /** decorative by default; set when the mark is the only label */
  label?: string
}) {
  const g = GEOMETRY[props.size ?? 'sm']
  const c = COLORS[props.mode ?? 'auto']
  const px = props.px ?? g.vb

  const a11y = props.label
    ? { role: 'img', 'aria-label': props.label }
    : { 'aria-hidden': 'true', focusable: 'false' }

  return (
    <svg
      class={props.class ?? 'brand-mark'}
      viewBox={`0 0 ${g.vb} ${g.vb}`}
      width={px}
      height={px}
      fill="none"
      {...a11y}
    >
      {props.label ? <title>{props.label}</title> : null}
      <rect
        x={g.x1}
        y={g.y}
        width={g.w}
        height={g.h}
        rx={g.rx}
        stroke={c.ink}
        stroke-width={g.stroke}
      />
      <rect
        x={g.x2}
        y={g.y}
        width={g.w}
        height={g.h}
        rx={g.rx}
        stroke={c.acc}
        stroke-width={g.stroke}
      />
    </svg>
  )
}
