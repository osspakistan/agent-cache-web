const PRE_DROPIN = `Reference <span class="path">.agentcache/docs/&lt;name&gt;/docs/</span> as the authoritative source
for these libraries. Do not rely on remembered APIs when it contains
the relevant information.

# agents cache: htmx, hono
# refresh: <span class="ok">agentcache add &lt;url&gt;</span> · or grab a fresh ZIP from the web app`

const PRE_CLI = `<span class="cm"># install the cli</span>
<span class="p">$</span> <span class="ok">npm i -g agentcache</span>

<span class="cm"># fetch a docs site into your project</span>
<span class="p">$</span> cd ~/projects/your-app
<span class="p">$</span> <span class="ok">agentcache add https://docs.example.com</span>
  → writing .agentcache/docs/example/ (428 pages)
  → <span class="num">ok</span> 312/428 pages · 14s

<span class="cm"># browse, list, delete</span>
<span class="p">$</span> agentcache list
<span class="p">$</span> agentcache view hono
<span class="p">$</span> agentcache delete hono`

const PRE_MCP = `<span class="cm"># .mcp.json</span>
{
  <span class="path">"mcpServers"</span>: {
    <span class="path">"agentcache"</span>: {
      <span class="path">"command"</span>: <span class="ok">"agentcache"</span>,
      <span class="path">"args"</span>: [<span class="ok">"mcp"</span>]
    }
  }
}`

const PRE_MCP_VIEW = `<span class="cm"># the agent's view of your docs</span>
agent: <span class="path">"implement OAuth with Clerk"</span>
  → <span class="ok">list_docs()</span>           matches keywords [clerk, oauth]
  → <span class="ok">get_doc_map(clerk)</span>    40-page structure, ~2k tokens
  → <span class="ok">get_doc_page(clerk, oauth.md)</span>`

export function Integration() {
  return (
    <section aria-labelledby="setup">
      <h2 id="setup" style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px;">
        Wire it in. One line.
        <span
          class="mono"
          style="font-size: 11px; color: var(--ink-soft); border: 1px solid var(--border); border-radius: 999px; padding: 2px 10px; font-weight: 400; letter-spacing: normal;"
        >
          CLI & MCP coming soon
        </span>
      </h2>
      <p class="sec-note">
        Three ways. Pick the one that matches your stack. Drop-in works today. CLI and MCP ship with
        the web app.
      </p>

      <input type="radio" name="install" id="i1" checked />
      <input type="radio" name="install" id="i2" />
      <input type="radio" name="install" id="i3" />
      <div class="tabs">
        <label class="tab" for="i1">
          drop-in folder
        </label>
        <label class="tab" for="i2">
          CLI
        </label>
        <label class="tab" for="i3">
          MCP
        </label>
      </div>

      <div id="ip1" class="panel">
        <div class="panel-head">
          <span class="dot"></span>
          <span>no install · point your agent at the folder</span>
        </div>
        <pre dangerouslySetInnerHTML={{ __html: PRE_DROPIN }} />
        <p class="panel-note">
          Works with every agent that reads files. Paste the line into{' '}
          <span class="path">AGENTS.md</span>, <span class="path">CLAUDE.md</span>, or{' '}
          <span class="path">.cursor/rules/</span>. The choice for purists. Zero install, zero
          runtime, full control.
        </p>
      </div>

      <div id="ip2" class="panel">
        <div class="panel-head">
          <span class="dot"></span>
          <span>install once · one command per docs site</span>
        </div>
        <pre dangerouslySetInnerHTML={{ __html: PRE_CLI }} />
        <p class="panel-note">
          Same pipeline as the web app, byte-compatible output. Ships when the backend does. The
          dot-folder you get is the same one.
        </p>
      </div>

      <div id="ip3" class="panel">
        <div class="panel-head">
          <span class="dot"></span>
          <span>stdio MCP · agent pulls pages on demand, not the whole bundle</span>
        </div>
        <pre dangerouslySetInnerHTML={{ __html: PRE_MCP }} />
        <pre dangerouslySetInnerHTML={{ __html: PRE_MCP_VIEW }} />
        <p class="panel-note">
          The agent pulls the one page it needs instead of you pasting 40. Local only, stdio
          transport, no account. Ships with the CLI.
        </p>
      </div>
    </section>
  )
}
