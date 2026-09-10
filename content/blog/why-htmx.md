# why i chose htmx over react for agent cache

**meta title:** why i chose htmx over react for a docs extraction tool
**meta description:** everyone uses react for web apps. i chose htmx + hono for agent cache. here's why server-rendered html beats spa for this use case.
**slug:** /blog/why-htmx-over-react
**target keywords:** htmx vs react, why htmx, htmx documentation tool, server-rendered htmx, htmx hono

---

when developers hear "web app," they reach for react. or next.js. or vue.

i chose htmx + hono + server-rendered html. no spa. no client-side framework. no build step.

for a documentation extraction tool, this was the right call. here's why.

## what the app actually needs

agent cache is a simple web app:
- a form where you paste a docs url
- a status page that streams extraction progress
- a results page showing extracted docs with a download link
- that's it

there are no real-time dashboards. no drag-and-drop. no complex state. no user accounts. no reactive data grid.

it's a form, a terminal-like stream, and a download button. that's the whole ui.

## the case against spaspas are for apps with lots of client-side interactivity. dashboards with real-time charts. collaborative editors. image editors. anything where the ui state changes constantly based on user input.

agent cache has none of that.

what do you get with a spa for a simple app? extra javascript bundle. extra build step. extra complexity. extra dependencies that need updating. extra attack surface.

what do you lose? nothing this app needs.

## htmx: html over the wire

htmx lets you add interactivity to server-rendered html without writing javascript.

want a form to submit without a page reload? add `hx-post="/api/extract"` to the form.

want a div to update when extraction progresses? add `hx-get="/api/status"` with polling.

want to stream progress from the server? server-sent events (sse) with `hx-sse`.

the server sends html fragments. the browser swaps them into the dom. no javascript state management. no virtual dom. no diffing.

## the stack: bun + hono + htmx + turso + r2

- **bun:** fast typescript runtime. starts instantly.
- **hono:** ultra-lightweight web framework. middleware-based. handles sse natively.
- **htmx:** html-over-the-wire for the frontend. no build step.
- **turso:** serverless sqlite for job metadata. zero ops.
- **r2:** cloudflare object storage for zip files. zero egress fees.

total client-side javascript bundle: **0 bytes.**

htmx is loaded from a cdn script tag: `<script src="https://unpkg.com/htmx.org@2.0"></script>`.

that's the entire frontend.

## what i gave up (and don't miss)

**component libraries.** no shadcn, no radix, no material ui. just server-rendered html with inline tailwind classes.

**npm ecosystem for frontend.** no webpack, no vite, no rollup. no bundle configuration. no tree-shaking.

**type safety across the api boundary.** no tRPC, no graphql. hono has typed routes, which covers most of it.

**offline capabilities.** not relevant. this app needs the server.

**client-side routing.** not relevant. each page is a separate route. `/`, `/job/:id`, `/docs/:id`.

## what i gained

**speed.** the first meaningful paint is under 100ms. no javascript to download, parse, execute. html arrives. it's rendered.

**simplicity.** the entire frontend is server-rendered html fragments. if something looks wrong, i check the server response. not the react devtools. not the console. the actual html.

**reliability.** fewer moving parts. fewer dependencies. fewer things to break. the server generates html. the browser displays it. that's layer zero.

**cost.** no frontend build pipeline. no cdn for js bundles. no dependency upgrades. the "frontend" is a script tag and some html.

**deployment.** bun runs the server. that's it. no "build" step that can fail. no webpack drama. no node_modules resolution hell.

## when react would be better

react would be better if agent cache had:
- a real-time dashboard with charts
- drag-and-drop file uploads (well, we have a simple form)
- offline mode
- complex client-side state (filters, search, sorting)
- user accounts with client-side navigation

none of these exist. so react would be solving problems we don't have.

## results: performance numbers

| metric | react approach (estimated) | htmx approach (actual) |
|---|---|---|
| time to first paint | 300-500ms | ~80ms |
| client js bundle | 100-300 KB | 0 KB |
| total dependencies | 1000+ | ~50 |
| build time | 5-15s | 0s (no build) |
| server response | same | same |

the server doesn't change. it's hono either way. the difference is what's sent to the browser.

## should you use htmx?

use htmx if your app is:
- content-heavy (blogs, dashboards, admin panels)
- form-heavy (wizards, configuration, settings)
- real-time state is handled by the server (sports scores, extraction progress, logs)
- you want instant start times and zero client bundle

use react (or similar) if your app is:
- interaction-heavy (image editors, spreadsheets, games)
- needs offline capabilities
- has complex client-side state that the server doesn't manage
- requires real-time collaboration between users

for agent cache, the choice was obvious. it's a server-heavy app with minimal interactivity. server-rendered html + htmx is exactly the right abstraction.

## the bottom line

developers reach for react by default. that's a habit, not a requirement.

for a simple server-rendered app, htmx + hono is the pragmatic choice. zero client bundle. zero build step. zero regrets.

---

**related:**
- [hono vs express: why hono won](/blog/why-hono-over-express)
- [agent cache architecture deep dive](/blog/architecture-deep-dive)
- [100 sites extracted: what worked](/blog/100-docs-sites-what-broke)
