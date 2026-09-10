# from html to markdown: building a documentation html cleaner

**meta title:** how i convert documentation html to clean markdown (jsdom + turndown)
**meta description:** when raw markdown isn't available, i extract docs using jsdom, turndown, and framework-specific cleaners. here's how my html extraction pipeline works.
**slug:** /blog/html-to-markdown-extraction
**target keywords:** html to markdown extraction, documentation html cleaner, turndown documentation, jsdom documentation extraction, clean markdown from html

---

most modern documentation frameworks expose raw markdown. but 38% of the sites i extract don't. custom frameworks. older docusaurus. proprietary cms systems.

for those sites, i fall back to html extraction. fetch the html. parse the dom. strip noise. convert to markdown. it sounds simple. it's not.

html extraction is the hardest part of the pipeline. a generic html-to-markdown converter isn't enough. docs sites are full of nav bars, cookie banners, "was this helpful" buttons, sidebar trees, and cta boxes. if you convert all that to markdown, your docs are polluted.

here's how agent cache handles it.

## jsdom parses, cleaners strip noise, turndown converts

**jsdom** parses html in a node-like environment. gives me a real dom tree to manipulate. i can query selectors, traverse nodes, and extract specific elements.

**turndown** converts html to markdown. handles headings, lists, links, code blocks, tables. gives solid baseline output.

**custom cleaners** strip framework-specific noise. each docs framework has its own class names and structure. i don't guess. i know.

## step 1: fetch and parse

curl gets the raw html. headers include a reasonable user-agent. polite rate limits. no aggressive concurrency.

jsdom parses the html: `new JSDOM(htmlString).window.document`.

now i have a dom. time to find the content.

## step 2: identify and extract content area

the hardest problem: where's the actual content?

every framework puts it somewhere different:

| framework | content selector |
|---|---|
| mintlify | `article[data-kind]` or `main` |
| docusaurus | `.theme-doc-main` |
| fumadocs | `article.prose` |
| nextra | `main` |
| gitbook | `.book-body` |
| generic fallback | `main`, `article`, or largest text block |

framework detection happens first. i look for meta tags (`generator`), css class patterns, and known html structures. once i identify the framework, i know which selector to use.

if framework detection fails, i fall back to a heuristic: find the element with the most text content that's not in a nav or footer.

## step 3: strip the noise

within the content area, there's still junk.

**navigation breadcrumbs:** mintlify puts breadcrumbs in `nav[data-mintlify]`. docusaurus uses `nav[itemtype="https://schema.org/BreadcrumbList"]`. these get removed.

**"edit this page" links:** common on open-source docs. useless for agents. removed.

**"was this helpful" widgets:** feedback forms at the bottom of pages. removed.

**"next/previous" navigation:** links to adjacent pages. removed.

**cookie banners:** injected by third-party scripts. usually outside the content area, but occasionally slip in.

**admonition boxes:** tip, warning, info boxes. framework-specific. these are actually useful content. i keep them but standardize their format.

**code block buttons:** "copy" buttons on code blocks. removed. the code itself is kept.

## step 4: handle tabs and version selectors

many docs sites use tabs ("javascript" vs "python" vs "go") and version dropdowns ("v1" vs "v2").

the challenge: active tab content is in the dom. inactive tabs might be hidden with `display: none` (i skip those). but some frameworks render all tab content and hide with css. jsdom respects css, so hidden content is naturally excluded.

for versions: i extract the default (usually latest) version. version selectors are removed from the output.

## step 5: convert to markdown

turndown runs on the cleaned html. converts:
- headings (`<h1>` → `# heading`)
- lists (`<ul>`/`<ol>` → `- item` / `1. item`)
- code blocks (`<pre><code>` → fenced code blocks with language)
- links (kept, usually relative to docs root)
- tables (pipe tables)
- inline code (backticks)
- emphasis and bold

## step 6: post-process

after turndown, i clean up common issues:

**empty lines:** turndown sometimes leaves multiple blank lines. compressed to max 2.

**heading levels:** normalize so the page's first heading becomes h1, regardless of what the html had.

**link fixing:** relative links are adjusted based on the page's url. absolute links are kept.

**table formatting:** ensure pipe tables align properly for readability.

**code fences:** ensure proper language tags (from class names like `language-typescript` → `ts`)

## framework-specific extractors

my best results come from framework-specific logic.

**mintlify extractors** know that content is in `article[data-kind="document"]` and sidebar nav is in `aside[data-testid="sidebar"]`. i strip everything outside the article.

**docusaurus extractor** handles their specific html: `.theme-doc-markdown` for content, `.theme-admonition` for info boxes, `tabs-container` for tabs.

**fumadocs extractor** knows their `article.prose` and `tabs` components.

without these framework-specific extractors, i'd need a generic approach. and generic approaches produce generic (worse) results.

## quality metrics

i measure extraction quality with:
- **content ratio:** extracted text vs. total html text. >80% is good.
- **nav removal:** no nav links in output. verified manually.
- **code block count:** matches visual inspection.
- **heading structure:** h1 first, then h2, h3. no skips.

for popular frameworks, quality is 95%+. for custom frameworks, 70-80% is typical. for spa sites, it's unpredictable.

## making the html fallback as clean as raw markdown

html extraction is the fallback. i try everything else first. but for the 38% of sites that need it, quality matters. bad extraction means noisy docs. noisy docs mean confused agents.

the goal is simple: make the fallback so good that users can't tell whether extraction used direct .md or html purification.

i'm not there yet. but i'm close.

---

**related:**
- [what i try before parsing html](/blog/acquisition-ladder)
- [100 sites extracted: what broke](/blog/100-docs-sites-what-broke)
- [mintlify vs docusaurus: framework rankings](/blog/docs-framework-agent-readability)
