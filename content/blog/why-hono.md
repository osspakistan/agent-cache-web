# why i chose hono over express for agent cache

**meta title:** hono vs express: why hono won for our docs extraction tool
**meta description:** express is the default. fastify is performant. i chose hono. here's why an ultra-lightweight framework was the right call for agent cache.
**slug:** /blog/why-hono-over-express
**target keywords:** why hono, hono vs express, hono vs fastify, hono web framework, lightweight typescript framework

---

express is the default for node.js web apps. it's everywhere. tutorials start with express. job descriptions mention express.

i chose hono.

## what hono is

hono is a tiny web framework. smaller than express. faster than express in some benchmarks. built for edge runtimes but works everywhere.

key features:
- middleware-based routing (like express)
- built-in support for jsx, streaming, and server-sent events
- edge-compatible (cloudflare workers, deno, bun)
- pure typescript
- tiny bundle: ~14kb

## why not express

express served the node ecosystem for 15 years. but it's showing its age:
- callback-based middleware (promises work but aren't native)
- no built-in typescript support
- large dependency tree
- designed for the node runtime, not the edge

express works. it's just not optimal for 2026.

## why not fastify

fastify is fast. genuinely fast. built by the same team that built express.

but fastify's speed comes from overhead that doesn't matter for agent cache:
- json schema validation
- plugin architecture
- logging and hooks system
-tighter security headers

these are great features. but we don't need them. agent cache has simple routes: form submission, status streaming, download. no complex validation. no plugins.

fastify is faster for some workloads. but for us, hono is simpler.

## why hono won

**sse support.** agent cache streams extraction progress via server-sent events. hono has native sse support. express needs a library.

**edge portability.** we started with cloudflare workers (before switching to a vps). hono runs on workers natively. express doesn't.

**bundle size.** agent cache's server is small. hono matches. express is overkill.

**built-in jsx.** hono has first-class jsx support for server-rendered html. no additional libraries needed.

**typescript.** hono is written in typescript. types are excellent. express's types are community-maintained and sometimes lag behind.

## hono + bun

we run on bun. not node.

bun is fast. particularly for io-bound workloads. documentation extraction is io-bound: mostly fetching pages over the network.

hono on bun: cold start under 5ms. throughput higher than express on node. memory usage lower.

for a simple web app, this combination is hard to beat.

## what we lost

**ecosystem.** express has 15 years of middleware. authentication libraries, validation libraries, template engines, everything.

hono's ecosystem is smaller. but it's growing fast. and for our needs (lightweight server, simple routes), the existing middleware is sufficient.

**familiarity.** almost every node developer knows express. hono is newer. onboarding contributors is slightly harder.

**corporate backing.** express is backed by the openjs foundation. hono is maintained by one developer with community contributions.

these are real tradeoffs. but for our use case, the benefits outweigh the costs.

## performance comparison

| metric | express (node) | hono (bun) |
|---|---|---|
| cold start | ~50ms | ~5ms |
| req/sec (hello world) | ~15k | ~25k |
| memory footprint | ~40MB | ~15MB |
| framework size | ~500kb | ~14kb |
| sse support | library needed | built-in |

note: these are rough benchmarks. real workloads vary.

## when express would be better

express is still the right default for:
- teams with existing express expertise
- complex middleware chains
- applications that need ecosystem libraries
- corporate environments with standardization requirements

## bottom line

hono isn't better than express for everything. it's better for agent cache.

lightweight. fast. edge-compatible. built-in sse. tiny bundle. bun-compatible.

for a simple docs extraction app, that's the right combination.

---

**related:**
- [why i chose htmx over react](/blog/why-htmx-over-react)
- [agent cache architecture deep dive](/blog/architecture-deep-dive)
