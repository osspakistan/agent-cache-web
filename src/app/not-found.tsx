/** 404 component — full page (wrapped in layout by the router). */
export default function NotFound() {
  return (
    <div class="wrap" style="padding:96px 20px;text-align:center">
      <h1>404 — not here.</h1>
      <p class="lede">
        This page doesn't exist. <a href="/">Back to the docs pile →</a>
      </p>
    </div>
  )
}
