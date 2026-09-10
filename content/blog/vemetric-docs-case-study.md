# vemetric broke us: 40 hours, 3 fixes, and the bug that survived all of them

**meta title:** vemetric docs extraction case study: 40 hours, 3 fixes, one stubborn bug
**meta description:** a single docs site ate 40 hours and survived 3 fixes. here's the full autopsy of why vemetric broke agent cache after 100 sites of testing.
**slug:** /blog/vemetric-docs-case-study
**target keywords:** vemetric docs extraction, docs extraction failure case study, documentation crawler debugging, agent cache case study, docs extraction edge case

---

40 hours. that's what one documentation site cost me this week. vemetric, a small analytics tool with maybe 30 pages of docs. thirty pages. i've extracted 428-page monsters in under a minute. this one refused to die.

this is the full autopsy. what the site serves, what my pipeline claimed it did, what it actually did, and the bug that survived three separate fixes.

## first, the numbers

context from the 100-site benchmark i ran earlier this year:

- 88% of documentation sites extract cleanly
- 12% fail, mostly from bot protection
- github tree extraction: fastest path, 20-40s for full sites
- html purification: slowest, 190-390s

vemetric looked like a lock for the github tier. open-source product, github link right in the header. easy money.

it wasn't.

## what vemetric actually serves

i probed everything the acquisition ladder checks:

| check | result |
|---|---|
| sitemap.xml | does not exist (0 urls) |
| llms.txt / llms-full.txt | 404 |
| direct .md endpoints | 404 |
| github repo docs | 13 md files, zero of them docs content |

that last one is the trap. the vemetric/vemetric repo has readme, contributing, license, security policy. thirteen markdown files. not one page of actual documentation. the docs live in a private astro app rendered server-side.

so the honest answer was: tier 5, html purification, the slow path.

that is not what my pipeline chose.

## the lie in the logs

my job log for the extraction says:

```
Discovered official GitHub repository: https://github.com/vemetric/vemetric
Acquisition strategy selected: github-raw-markdown
```

then it crawled 32 pages off the live site and converted them with html purification. the "Copy Copied!" button text left in code blocks and the /_astro/ image paths prove it.

the strategy label said github. the work was html. the resolver grabs the first github.com href it finds in the page html and declares it the docs repo. zero verification that the repo contains docs. a footer link is enough to flip the strategy and print a lie into the job record.

fix one: verify the repo actually holds docs markdown before trusting tier 2. if the tree has no docs paths, fall through honestly.

## the tree from hell

content was never the real problem. all 32 pages landed in the bundle. the navigation was the crime scene.

the live sidebar on vemetric.com/docs is clean. five groups, right there in the html:

```
Installation (4 pages)
Product Analytics (5 pages)
Advanced Guides (6 pages)
SDKs (11 pages)
API Reference (10 pages)
```

my extractor produced this instead:

```
Google Tag Manager     -> Google Tag Manager
WordPress              -> WordPress
Next.js                -> Next.js
...
Node.js SDK            -> Node.js SDK, PHP SDK, Python SDK, Go SDK
Getting Started        -> 8 api endpoints
```

sixteen sections. every group label destroyed. each group renamed after its first child page. and my two "getting started" pages (product analytics vs rest api) became indistinguishable.

two bugs, stacked:

1. the group labels are `<strong>` tags. my sidebar parser only reads `<a>` and `<button>`. the categories were literally invisible to it.
2. when a parser produces groups, a separate loop promoted every child page to a top-level section and threw the group wrapper away.

so the viewer showed a flat mess of sixteen self-referencing sections, and reported SUCCESS: 32 files. success lies too.

## the fix that finally worked

i stopped trying to out-smart the dom. third rewrite of the sidebar logic in a week, and every dom selector i write breaks on the next site.

new approach, and it sounds dumb until it works: convert the page to markdown first, then parse the markdown.

turndown is deterministic. it turns the wild sidebar dom into something boring:

```markdown
-   [Installation](/docs/installation)
    -   [Google Tag Manager](/docs/installation/google-tag-manager)
-   **Product Analytics**
    -   [Getting started](/docs/product-analytics/getting-started)
```

a `<strong>` label, an `<a>` label, a bare text label. in markdown they all become parseable text. nested bullets are nesting. bold text without a link is a group. that's the whole parser. no llm, no ai, plain string logic on normalized text.

then the pipeline runs both paths and scores them:

- the dom tree: 16 sections, every section a single item. score: 16
- the markdown tree: 9 real sections, correct groups, correct labels. score: 116

flat trees lose. every time. vemetric now extracts as:

```
Introduction (1)
Installation (5)
Dashboard (1)
Globe (1)
FAQs (1)
Product Analytics (5)
Advanced Guides (6)
SDKs (11)
API (10)
```

the log line even admits what happened: `using extractor markdown-nav (dom primer scored flat)`.

## why it took 40 hours

honest breakdown, because "it was hard" is not a diagnosis:

- the job reported SUCCESS on every attempt. nothing crashed. the failure mode was plausible garbage, which is the most expensive failure mode to debug
- each fix addressed one layer: strategy label, group labels, group promotion. three layers, three fixes, and the site kept producing wrong output until all three landed
- the 100-site benchmark made me overconfident. 88% success rate teaches you the happy path, not the sites that report success while lying

the lesson i keep re-learning: a green checkmark on a crawl means pages were fetched. it says nothing about whether the tree means anything.

## if you maintain docs like vemetric's

three things would have made this site extract in under a minute:

1. a sitemap.xml
2. an llms.txt pointing at your docs
3. raw .md endpoints (astro makes this a few lines of middleware)

any one of the three. your docs are public and meant to be read. agents are reading them whether you plan for it or not.

## bottom line for pipeline builders

plausible garbage beats crashes for wasting your time. if your extractor reports success, make it prove structure: count groups, flag single-item sections, score the tree. and when the dom keeps lying, convert to markdown and parse that instead. the dom is a rendering target. markdown is the contract.

---

**related:**
- [100 sites extracted: what broke](/blog/100-docs-sites-what-broke)
- [the acquisition ladder: how extraction works](/blog/acquisition-ladder)
- [from html to markdown: the hard extraction path](/blog/html-to-markdown-extraction)
- [why i extract docs without an llm](/blog/why-no-llm-extraction)
