# how stripe's custom docs framework broke me (and what i learned)

**meta title:** how stripe's custom docs broke my crawler: lessons from extracting 8.7MB
**meta description:** stripe doesn't use mintlify, docusaurus, or gitbook. they built their own. extracting it took days. here's what i found.
**slug:** /blog/stripe-docs-crawler-challenges
**target keywords:** stripe docs crawler, stripe documentation extraction, stripe api docs crawl, custom docs framework

---

stripe has the most popular api documentation on the internet.

they also have one of the most custom docs frameworks i've encountered. extracting it was not a "paste url and wait" operation. it was days of work. back-and-forth. wrong assumptions. dead ends.

here's what made it hard, and exactly how i got through it.

## it's not mintlify. it's not docusaurus. it's not gitbook.

i have extractors for the common frameworks. mintlify? `.md` endpoints, done. docusaurus? structure in `docusaurus.config.js`, raw markdown in `docs/` folder. gitbook? partially supported.

stripe uses none of these. they built their own.

this is the first thing that hits you when you try to extract stripe. your framework detector returns "unknown." your tier 1-4 ladder methods fail. your html purification pulls rendered pages, but the navigation is empty, the content is fragmented, and you're looking at a shell instead of a site.

## content was in redux state, not the page html

stripe's docs are server-side rendered with javascript hydration. but here's the catch: the actual documentation content isn't in the html.

it's in a preloaded redux state object that's embedded in the page as a massive json blob. the html you fetch contains the shell: header, sidebar skeleton, maybe a title. but the actual paragraphs, code examples, parameter tables. all of that is in `window.__PRELOADED_STATE__` or injected via inline script.

this means:

**headless js dom (jsdom) sees the html. great.**
**but the content is in a script tag. jsdom doesn't run scripts.**
**so jsdom sees an empty page.**

i tried running jsdom with `runScripts: 'dangerously'`. still didn't work. the preloaded state uses `JSON.parse()` inside the script, but the initial injection might happen before dom ready in a way jsdom can't replicate.

## strategy: extract json from the script tag

when standard html purification failed, i switched to raw text extraction.

step 1: fetch the html with a simple `GET` request. no jsdom. just raw text.

step 2: find the preloaded redux state. this is a massive json object inside a `<script>` tag. usually marked with an id or class. sometimes it's the first large `<script>` after the `<head>`.

step 3: extract that json with regex or string operations. no html parsing needed. i'm looking for `window.__PRELOADED_STATE__ = {...}` or similar patterns.

step 4: parse the json. the actual markdown content lives inside this state object, under keys like `page.content`, `page.markdown`, or `sections[0].content`.

step 5: convert the structured content back to markdown. sometimes it's already markdown. sometimes it's a custom format that needs transformation.

this is not elegant. this is extraction archaeology. i'm not parsing a docs site. i'm reverse-engineering a single-page app.

## mapping page ids back to the sidebar took a day

stripe has hundreds of pages. the url structure is clean: `/docs/api/charges`, `/docs/api/customers`, etc. but the navigation tree, the sidebar that groups pages into "payments," "billing," "identity", is not in any sitemap i could find.

i had to:
- extract the navigation structure from the redux state
- map each page id to its url slug
- reconstruct the tree manually
- verify against the live site's sidebar

without an llm doing this, i stared at json objects for hours. nested arrays. objects with `children` arrays. pages with `parentId` references. some pages orphaned (api reference pages with no parent). some parents with no content of their own (pure category pages).

i spent a full day just mapping the tree. not extracting content. just mapping urls to categories. yeh waqt nahin milega dobara.

## size: 8.7 megabytes of dense api reference

stripe docs are massive. not in page count (maybe 200-300 pages). in density.

every api endpoint page has:
- description
- request parameters table (20+ rows)
- response object schema
- code examples in 6+ languages
- error codes
- related endpoints
- pagination info
- metadata

a simple "create a charge" page might be 50kb of markdown. multiply by 200 pages. add the product docs (not just api docs, stripe has guides, tutorials, concept docs). add the changelog. add the webhooks documentation.

8.7MB. compressed.

uncompressed, it's closer to 30MB. this is larger than many applications' entire source code.

## what framework detection looks like for stripe

my normal framework detection:

1. check for mintlify markers: `<meta name="generator" content="mintlify">`, not found
2. check for docusaurus markers: navbar class `navbar--fixed-top`, not found
3. check for fumadocs markers: `data-fumadocs-root`, not found
4. check for gitbook markers: `data-gb-page`, not found
5. check for nextra markers: `__NEXT_DATA__`, has this, but it's next.js, not nextra specifically
6. look for redux preloaded state: found.
7. flag as "custom/next.js with redux preloading"

this is tier 5, but not standard html purification. it's "html + script tag state extraction."

## why i didn't give up

i could have.

stripe is the #1 api docs site on the internet. if i can't extract stripe, my tool can't claim to work for "any docs url." stripe is the benchmark. the stress test. the worst-case scenario.

so i kept going. redid the extractor. added a stripe-specific parser. tested, failed, tweaked, tried again.

it took 3 days of focused work. but it works now.

## comparison: stripe vs other payment providers

| provider | framework | extraction difficulty | time |
|---|---|---|---|
| stripe | custom (next.js + redux) | very hard | 3 days |
| paypal | partially custom | medium | 4 hours |
| square | custom | hard | 1 day |
| braintree | docusaurus | easy | 20 minutes |
| razorpay | custom | medium | 3 hours |

stripe is the outlier. everyone else uses something i already know.

## what i learned

**custom frameworks are coming.** as docs become more app-like, more companies will build their own. the era of "everyone uses docusaurus or gitbook" is ending.

**preloaded state is a common pattern.** next.js, remix, sveltekit. all support preloading application state into the html. this is good for user experience (instant hydration). it's bad for simple crawlers.

**the json blob approach works.** when html fails, look inside `<script>` tags. the content might be there, just not where you expect.

**tree reconstruction without ai takes time.** an llm could probably map the navigation tree in minutes. i did it manually. it took a day. the human cost of "no ai in extraction" is real. but the result is deterministic and reproducible.

## how agent cache handles stripe now

stripe has a bespoke extractor in my framework detection pipeline. it:
- recognizes the redux preloaded state pattern
- extracts json from `<script>` tags
- parses the navigation tree from state
- converts content markdown via the same pipeline as other extractors
- handles edge cases like orphaned pages and reference-only parents

when you paste `https://docs.stripe.com` into agent cache, this extractor runs. 8.7MB later, you have the full stripe docs in markdown.

it's not fast. it's not simple. but it works.

## stripe still needs a custom extractor

stripe docs extraction was my hardest technical challenge. not because the tech is impossible. because it's custom, undocumented, and built for humans, not machines.

this is the frontier of docs extraction. as more companies build interactive, app-like documentation, extraction will get harder, not easier.

but that's why agent cache exists. the easy sites extract themselves. the hard sites need work. stripe is the hard site.

---

**related:**
- [what i try before custom extraction](/blog/acquisition-ladder)
- [100 sites extracted: what broke](/blog/100-docs-sites-what-broke)
- [html extraction: the hard path](/blog/html-to-markdown-extraction)
