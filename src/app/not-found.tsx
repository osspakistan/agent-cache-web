/** 404 component - full page (wrapped in layout by the router). */
export default function NotFound() {
  return (
    <div class="wrap" style="padding:96px 20px;text-align:center">
      <h1>404 - not here.</h1>
      <p class="lede">
        This page doesn't exist. <a href="/">Back to the docs pile →</a>
      </p>
      <div style="margin-top:48px;text-align:left;max-width:600px;margin-left:auto;margin-right:auto;">
        <h2 style="font-size:18px;margin-bottom:16px;">Looking for something?</h2>
        <ul style="list-style:none;padding:0;margin:0;">
          <li style="margin-bottom:12px;">
            <a href="/">→ Landing page</a> - Submit a docs URL for processing
          </li>
          <li style="margin-bottom:12px;">
            <a href="/docs">→ Packaged Docs</a> - Browse completed doc bundles
          </li>
          <li style="margin-bottom:12px;">
            <a href="/health">→ Health Check</a> - Service status (JSON)
          </li>
          <li style="margin-bottom:12px;">
            <a href="/llms.txt">→ llms.txt</a> - Agent-readable site index
          </li>
          <li style="margin-bottom:12px;">
            <a href="/sitemap.xml">→ Sitemap</a> - XML sitemap
          </li>
          <li style="margin-bottom:12px;">
            <a href="/openapi.json">→ OpenAPI Spec</a> - API documentation (JSON)
          </li>
        </ul>
      </div>
    </div>
  )
}
