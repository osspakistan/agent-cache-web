# why head requests fail on netlify edge and cloudflare workers

**meta title:** head requests fail on netlify edge and cloudflare workers: here's why
**meta description:** head requests return 502 bad gateway on netlify edge and cloudflare workers. here's why dynamic edge functions don't handle head and what i use instead.
**slug:** /blog/head-requests-fail-edge-routes
**target keywords:** head request fails netlify, head request 502 cloudflare workers, edge route head request, netlify head request error, cloudflare workers head request

---

when probing for raw markdown endpoints, the obvious first step is a head request. check if a resource exists without downloading it. saves bandwidth. faster.

but head requests fail on netlify edge and cloudflare workers. 502 bad gateway. every time.

here's why, and what i do instead.

## probing with head should save bandwidth

traditional approach:
1. send `HEAD /docs/page.md` 
2. check response code
3. if 200, send `GET /docs/page.md` to download

saves downloading content that doesn't exist. if `/docs/page.md` returns 404, you find out instantly without the body.

## head returns 502 where get works

on netlify edge and cloudflare workers, `HEAD` requests to dynamic routes return 502.

not 404. not 405 method not allowed. 502 bad gateway. a server error. confusing. misleading.

the same url with `GET` works perfectly. url exists. content exists. only `HEAD` fails.

## why head requests fail on edge platforms

edge functions (netlify edge, cloudflare workers) are lightweight v8 isolates. they run at the edge. they're fast. but they're not full node.js.

many edge function runtimes don't implement head handlers for dynamic routes. why? because:
- head is rarely used
- dynamic routes (next.js app router, sveltekit, etc.) generate responses on the fly
- the edge function generates the response, but the head handler path isn't implemented
- instead of a proper error, the runtime throws a 502

it's not a bug in your code. it's a gap in the platform.

## my solution: get with content-type verification

instead of:
```
HEAD /docs/page.md
```

i send:
```
GET /docs/page.md
Range: bytes=0-0
```

or simply a lightweight get without range, and check the `content-type` header immediately.

if the response is `text/markdown` or `text/x-markdown`, it's a valid markdown endpoint. i abort or continue based on headers.

if it's `text/html`, it's not a markdown endpoint. try something else.

**performance impact:** negligible. http headers are tiny. i'm downloading 0-1 KB to verify vs. the full page. for a 50 KB page, that's a 98% bandwidth savings over a full get.

## when head still works

head requests work fine on:
- static file servers (nginx, apache, caddy)
- traditional node.js servers (express, fastify, hono)
- cdn edge caches for static files
- object storage (s3, r2, gcs)

they only break on:
- dynamic edge functions (next.js on vercel, sveltekit on netlify)
- serverless functions with dynamic routing
- platforms where the runtime generates the response

## test each http method on your edge runtime

edge computing is great for latency. but it's a different runtime environment. not all standard http methods behave the same.

when building for edge platforms, test all http methods. don't assume head, options, patch, or delete work the same as get and post.

head is supposed to be safe and idempotent. but on edge, it's just unreliable for dynamic routes.

## if you're building a crawler

my recommendation: skip head for dynamic endpoints. use a lightweight get with early abort or range headers.

for static assets (images, css, js), head still works fine. those are served by cdns, not edge functions.

but for docs pages, which are almost always dynamic, head is a trap.

## use get and check the content type early

edge platforms are the future. but they have sharp edges. `HEAD` on dynamic routes is one of them.

use lightweight `GET` + content-type verification instead. it's more reliable, nearly as fast, and avoids the 502 trap.

---

**related:**
- [how i probe for cheaper extraction paths](/blog/acquisition-ladder)
- [cloudflare workers killed my serverless dream](/blog/cloudflare-workers-50-subrequest-limit)
