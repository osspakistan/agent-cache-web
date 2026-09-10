# content negotiation: getting markdown from sites that don't advertise it

**meta title:** content negotiation for docs: getting markdown with http headers
**meta description:** some docs sites serve raw markdown when you send accept: text/markdown. they don't advertise it. here's how we found them.
**slug:** /blog/content-negotiation-markdown
**target keywords:** content negotiation markdown, accept header markdown, hidden markdown endpoints, documentation content negotiation, accept text markdown

---

most documentation sites serve html. that's the default.

but some sites serve markdown if you ask correctly. send the right http headers, and you get raw markdown instead of rendered html.

this is content negotiation. an underappreciated technique for documentation extraction.

## what is content negotiation

http content negotiation is a standard where the client tells the server what content types it prefers. the server serves the best matching format.

the standard way:
```
GET /docs/page
Accept: text/html, text/markdown
```

if the server supports both, it picks the best match. if it only supports html, it serves html.

but here's the trick: many sites support markdown without advertising it.

## how we discovered hidden markdown endpoints

we discovered this accidentally.

while building the acquisition ladder, we tried appending `.md` to urls. that worked for mintlify and fumadocs. but for some sites, `.md` returned 404.

on a hunch, we tried:
```
GET /docs/page
Accept: text/markdown
```

and got back clean markdown. not html. actual markdown.

the site never advertised this capability. no docs mentioned it. but it worked.

## why sites support this

most modern web frameworks (next.js, sveltekit, nuxt) support content negotiation out of the box. if you have both `page.md` and a `page.tsx` renderer, the framework can serve either based on the accept header.

but many developers don't know about this feature. they never test it. never document it.

the capability exists but is invisible.

## which sites support it

we've found content negotiation support on:
- some docusaurus sites (surprisingly)
- a few nextra sites
- some custom next.js docs sites
- rare gitbook configurations

it's not universal. maybe 3-5% of sites support it. but when it works, it's the fastest path to clean markdown.

## how we detect it

the detection is part of our tier 4 probe:

```
GET /docs/some-known-page
Accept: text/markdown
```

if the response content-type is `text/markdown` → tier 4 works.

if the response is still `text/html` → tier 4 doesn't work. move to tier 5 (html purification).

we test with a known page (usually the getting-started or overview page) because those are most likely to exist.

## why this matters

content negotiation is a clue that a docs site is "agent-friendly." it means the maintainers (or their framework) thought about programmatic access.

even if the site doesn't have `.md` endpoints or `llms.txt`, content negotiation shows the underlying docs are accessible.

it's a tier 4 fallback. not primary. but worth probing because it costs nothing.

## implementation: one header change

```javascript
const response = await fetch(url, {
  headers: { 'Accept': 'text/markdown' }
})

if (response.headers.get('content-type').includes('markdown')) {
  // great, raw markdown
} else {
  // fallback to html
}
```

## where this fits

tier 4 of the acquisition ladder:
1. llms.txt
2. github tree
3. direct .md
4. content negotiation ← you are here
5. html purification
6. paid extraction

## the future

more sites will support content negotiation as developers learn about it. the accept header is a standard http feature. it's free to implement.

the bigger problem is awareness. most developers don't know their framework supports this.

if you're reading this and maintain a docs site: try `curl -H "Accept: text/markdown" your-docs-url`. you might already support it.

## bottom line

content negotiation is a hidden gem. most sites that support it don't know they support it.

if you're building a docs extraction pipeline, probe for this. it's a free tier that costs one http request.

---

**related:**
- [the acquisition ladder](/blog/acquisition-ladder)
- [html extraction: the hard path](/blog/html-to-markdown-extraction)
