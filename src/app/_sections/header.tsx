import { BrandMark } from '../../components/brand-mark'

export function Header() {
  return (
    <header>
      <div class="bar">
        <BrandMark size="sm" px={22} />
        <span class="wordmark">agent-cache</span>
        <button class="toggle" id="theme-toggle" type="button">
          dark
        </button>
      </div>
    </header>
  )
}
