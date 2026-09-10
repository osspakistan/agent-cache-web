# the state of documentation for ai agents — 2026 report

**meta title:** state of documentation for ai agents: 2026 report
**meta description:** we extracted 100+ documentation sites to understand how docs are adapting for agents. here's what we found — and where we're headed.
**slug:** /blog/state-of-docs-for-agents-2026
**target keywords:** state of documentation 2026, ai agent documentation report, documentation trends, agent-ready docs report

---

every year, documentation changes. in 2026, the change is about agents.

ai coding agents need to read docs. not humans. not search engines. agents. and most docs sites are not built for this audience.

we extracted 100+ documentation sites. here's what we found.

## methodology

100+ sites. extracted, analyzed, categorized. the sites span:
- javascript frameworks (react, next.js, hono, svelte)
- api documentation (stripe, twilio, sendgrid)
- databases (supabase, prisma, drizzle)
- dev tools (vercel, cloudflare, gitlab)
- ai/ml (openai, anthropic, hugging face)
- productivity tools (linear, notion, slack)

for each site, we recorded:
- what extraction tier worked (llms.txt, github, direct .md, html, or failed)
- framework used (if detectable)
- bot protection level
- total pages extracted (where applicable)
- content quality assessment

## key finding 1: llms.txt adoption is growing but still low


current adoption: roughly 8% of sites.

who supports it: mintlify (auto-generated), fumadocs (opt-in), some docusaurus sites (manual), anthropic (yes), vercel (yes), stripe (no).

why it's slow: it's a new standard. developers need to know it exists, understand its value, and add it. most don't even know about it.

the value proposition is clear: one text file at `/llms.txt` gives agents a map of your docs. but adoption requires awareness, and awareness requires time.

**prediction:** 25% adoption by end of 2027. 50% by 2028. it'll become table stakes for new docs sites.

## key finding 2: framework consolidation is real

in 2023, docs frameworks were fragmented. dozens of tools. each slightly different.

in 2026, it's consolidating around a few:

| framework | share of extracted sites | agent-friendliness |
|---|---|---|
| mintlify | ~18% | high |
| docusaurus | ~22% | medium |
| fumadocs | ~8% | high |
| gitbook | ~12% | medium |
| notion-as-docs | ~5% | low |
| custom | ~35% | varies |

mintlify and fumadocs are pulling ahead specifically because they expose raw markdown by default. this is increasingly a competitive advantage.

docusaurus is mature and widely used, but raw markdown isn't exposed as cleanly. you have to go to github or parse html.

custom frameworks are 35% of sites. this is the hardest category. every custom framework is its own extraction challenge.

## key finding 3: bot protection is increasing

12% of sites failed extraction due to bot protection. this is up from ~5% in our earlier tests.

reasons:
- cloudflare bot fight mode (increased sensitivity)
- per-client rate limiting
- mandatory user-agent verification
- some sites serving captchas to non-browser requests

this trend is concerning. as docs become more "app-like" (javascript-heavy, interactive), they become harder to extract programmatically.

sites with heavy bot protection:
- some next.js sites (vercel hosting, cloudflare in front)
- enterprise docs behind auth walls
- sites using bot management services (datadome, kasada)

the direction is clear: extraction is getting harder, not easier. the free web is becoming gated.

## key finding 4: agent-first design is emerging

a small but growing number of sites are designed with agents in mind.

signs:
- llms.txt files
- direct .md endpoints
- changelog and version info in machine-readable formats
- clean url structures predictable by pattern
- api-first documentation (content and presentation separated)

mintlify and fumadocs are the leaders here. their default output is already agent-friendly.

the next tier: docusaurus with plugins, next.js with custom setup, nextra.

but "agent-first" isn't mainstream yet. most docs are still "human-first with agent support" at best.

## framework rankings (2026 update)

based on our extraction experience:

**tier 1 (easiest):**
1. github pages (raw markdown files)
2. mintlify (.md endpoints, llms.txt)
3. fumadocs (.md endpoints, llms.txt)

**tier 2 (moderate):**
4. nextra (raw files in repo, next.js rendering)
5. docusaurus (markdown source in repo)
6. gitbook (partial .md support)

**tier 3 (hard):**
7. notion (api-based, limited)
8. next.js custom (varies by implementation)
9. entirely custom (stripe, linear, etc.)

**tier 4 (impossible for us):**
10. auth-walled docs
11. heavily bot-protected sites (datadome, etc.)

## industry breakdown

**best:** open source projects on github. raw markdown. no tricks. 100% extraction success.

**good:** modern saas companies using mintlify or docusaurus. most extract cleanly.

**mixed:** older companies with custom docs. some expose markdown. some don't.

**worst:** enterprise docs behind auth, notion-based docs, heavily interactive docs built as web apps.

## predictions for 2027

1. **llms.txt standardizes.** by end of 2027, it'll be expected for new docs sites. major frameworks include it by default.

2. **content/presentation separation becomes standard.** docs content stored as markdown/github. rendering layer separate. this is the "agent-first" architecture.

3. **bot protection arms race continues.** as extraction tools proliferate, sites invest more in bot protection. this hurts legitimate use cases.

4. **paid extraction services grow.** firecrawl, context.dev, context7 — these services will grow because free extraction is getting harder.

5. **agent cache becomes unnecessary (for agent-first sites).** if docs frameworks expose markdown natively, extraction tools become less needed. but custom sites will always need work.

## the full dataset

this report is based on 100+ extractions. the dataset is:
- not public (sites don't necessarily want to be listed)
- internally maintained at agent cache
- used to improve our extraction pipeline

if you're a researcher studying docs accessibility, email us. we can share anonymized insights.

## methodology notes

- extraction performed between january and september 2026
- sites chosen based on developer popularity, not random sampling
- extraction defined as: clean markdown for every public docs page, with navigation structure preserved
- "failed" means: couldn't produce usable markdown for the full site

## bottom line

documentation is changing. slowly. sites are becoming more agent-aware, but most are still built for human eyes only.

the gap between agent-readiness and reality is large. that's the space agent cache operates in. as long as docs sites require extraction, there's work to do.

but the long-term trend is clear: docs will become agent-first. and when that happens, extraction tools like ours will transform from necessity to convenience.

---

**related:**
- [framework extractor rankings](/blog/docs-framework-agent-readability)
- [the acquisition ladder](/blog/acquisition-ladder)
- [agent cache is going open source](/blog/open-source-direction)
