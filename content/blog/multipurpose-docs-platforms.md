# knowledge bases, ai docs, and platforms that do too much

**meta title:** knowledge base vs docs platform: do you need more than markdown?
**meta description:** document360, intercom, gitbook, and ai-native docs tools compared. when a docs site becomes a support portal, extraction gets complicated.
**slug:** /blog/knowledge-base-docs-platforms-compared
**target keywords:** knowledge base documentation, docs vs knowledge base, ai documentation platform, support portal documentation, documentation platform comparison

---

documentation tools fall on a spectrum. on one end: pure docs. markdown files rendered to html. on the other end: multi-purpose platforms that combine docs with support, chat, ticketing, and ai.

this article is about the other end. the platforms that do more than docs. and why "more" often means "harder to extract."

## tier 1: knowledge bases that are mostly docs

these tools are knowledge bases first, but their output resembles documentation sites. extraction is possible but requires extra work.

**document360**: full-featured saas knowledge base. public product docs and private internal bases. widget for in-app search. ticket integrations (zendesk, intercom, freshdesk). multi-versioning. localization.

**extraction reality:** document360 exports to html and pdf. the public docs are accessible. but the structure is platform-specific. no `.md` endpoints. no `llms.txt`. i can extract the content, but i lose the clean markdown structure.

**help scout**: clean, zero-config kb. "beacon" widget for searching docs and initiating chat. the kb articles are straightforward. extraction: the public articles are just html pages. i parse them.

**crisp**: all-in-one messaging with kb site generator. multi-language translations. integrated live chat popup. the kb content is accessible but mixed with chat features. extraction targets just the kb pages.

**freshdesk**: comprehensive customer support portal. kb articles + self-service portals + community forums + freddy ai bot. the kb section extracts like a standard docs site. the forums and ai bot responses are outside my scope.

## tier 2: support-first, docs-second

these platforms lead with support and chat. documentation is a feature, not the product.

**zendesk guide**: enterprise standard. knowledge base + live chat + ticket routing + zendesk ai agents. the docs exist within a larger support ecosystem. extraction: possible for public articles. but the site structure is designed for ticket deflection, not reading.

**intercom**: help center + messenger + fin ai. fin reads knowledge articles to answer questions automatically. the help center is extractable. but intercom's real value is the conversational layer, not the static docs.

**hubspot service hub**: kb portals linked to crm. native live chat. ticket automation. multi-language. docs are a module inside a larger platform. extraction: public kb articles only.

**tidio**: help center + lyro ai. similar to intercom's model. the kb is the extractable part.

## tier 3: ai-native documentation platforms

new category. tools that use ai to generate, update, or serve documentation. most are vaporware or feature-thin.

**documentation.ai**: connects to codebases and prs. continuously writes and updates docs with autonomous agents. sounds impressive. in practice: works for api references. fails at conceptual docs, tutorials, and edge cases. the "autonomous" part is a stretch.

**docsalot**: unifies product manuals and dev docs. optimized for humans and agents. native mcp server. still early. promising but unproven.

**hyperdocs**: automatic change detection from git prs. ai content publishing. another "ai writes docs" tool. useful for reference generation. not ready for tutorials or architecture docs.

**docsio**: ingests repos or web content. outputs hosted sites with automatic `llms.txt` and mcp support. the extraction angle is interesting: it extracts docs for you, then hosts them. overlaps with what agent cache does.

**docuwriter.ai**: inspects source code across 20+ languages. generates api references and tutorials. works for codebases with good comments. fails for poorly documented code (which is most code).

## where these platforms make extraction harder

here's the issue with multi-purpose platforms: they weren't built for extraction.

**zendesk:** articles exist, but the url structure is opaque. `/hc/en-us/articles/360012345678` doesn't tell you what the article is about. no sitemap in standard format. no `llms.txt`.

**intercom:** help center urls are cleaner, but the content is wrapped in intercom's chrome. sidebars, widgets, chat buttons everywhere. the actual article is a small percentage of the html.

**document360:** public articles are accessible. but the navigation tree is generated dynamically. extracting the full structure requires crawling every page and building the tree from breadcrumbs.

**ai-native platforms:** most generate output but don't expose it in machine-readable formats. an agent that wants to read docsalot's generated docs might need to go through docsalot's api. which defeats the point.

## what i do at agent cache

for knowledge base platforms:
1. try to extract the public kb articles
2. parse the html to clean content
3. reconstruct navigation from breadcrumbs or sidebar links
4. accept that the output is less clean than a docusaurus or mintlify site

for ai-native platforms:
1. i don't extract them. i extract the sources they claim to ingest
2. if docsio says it reads your github repo, i go to the repo instead
3. the hosted output is ephemeral. the source is permanent

## when to choose a knowledge base over pure docs

**choose a kb platform if:**
- you need integrated ticketing and chat
- your docs and support are the same team
- you need in-app help widgets
- your audience is end users, not developers

**choose pure docs if:**
- your audience is developers
- you need api references and code examples
- agent-readiness matters
- you want to own your content

**the hybrid approach:** use a docs generator (mintlify, docusaurus) for technical docs. use a kb platform (help scout, document360) for user guides and support articles. they're different audiences. different tools.

## keep technical docs easy to read outside the platform

multi-purpose platforms add features that sound valuable. ticketing integration. ai chatbots. crm sync. but each feature is another extraction boundary. another format to handle. another api to call.

pure docs tools say: "here's the content." kb platforms say: "the content is inside this platform. use this api to read it."

for agents, the first model is infinitely better.

---

**related:**
- [pure docs generators ranked](/blog/pure-docs-generators-ranked)
- [ai-native documentation platforms: hype or future](/blog/ai-native-documentation-platforms)
