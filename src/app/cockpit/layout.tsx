import { Nav } from '../../components/nav'
import type { LayoutComponent } from '../../router/scan'

/**
 * Cockpit Layout: Dedicated wide wrapper (max-width: 1440px)
 * Provides clean margins, padding, and layout structure tailored for admin tables and bento cards.
 */
const CockpitLayout: LayoutComponent = ({ children }) => {
  return (
    <div
      class="cockpit-layout"
      style="
        width: 100%;
        max-width: 1440px;
        margin: 0 auto;
        padding: 0 24px 60px;
        box-sizing: border-box;
      "
    >
      <Nav active="cockpit" wide={true} />
      <div class="cockpit-body">{children}</div>
    </div>
  )
}

export default CockpitLayout
