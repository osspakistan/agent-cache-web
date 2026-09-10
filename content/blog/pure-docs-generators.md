# pure documentation generators ranked for agent-readability

**meta title:** best documentation site generators for ai agents (2026)
**meta description:** not all docs generators are equal for ai agents. here's my ranking of pure documentation ssgs based on extraction experience from 100+ sites.
**slug:** /blog/pure-docs-generators-ranked
**target keywords:** best docs generator, documentation ssg ranking, agent readable documentation, docs framework for ai, static site generator docs

---

a documentation generator turns markdown into a website. that's it. no api testing, no knowledge base features, no ticketing integration. just docs.

these are the pure tools. and they're not all equal when it comes to ai agents reading them.

## tier 1: agents read these for free

**mintlify**

saas docs platform. auto-generates `llms.txt`. every page has a `.md` endpoint. my extraction pipeline reaches mintlify sites and immediately thinks "this is too easy."

the tradeoff is saas lock-in for hosting. the content stays in your repo. the rendering, search, and ai features are on mintlify's infrastructure.

**fumadocs**

next.js-based. open source. fast. exposes `.md` endpoints natively. if your project already uses next.js, adding fumadocs is trivial. extraction is trivial too.

the maintainer is one developer. that's a risk. but it's open source, so the risk is forkability, not abandonment.

**starlight**

astro's official docs framework. zero client-side javascript by default. the fastest docs site you can build. extraction is easy because the html is clean, semantic, and uncluttered.

if you care about performance and accessibility, starlight is hard to beat. if you need complex interactive components, you might outgrow it.

**vitepress**

evan you's docs framework for vue. clean, fast, minimal. markdown source is in your repo. the rendered site is static html. extraction is straightforward: go to github for the markdown, or parse the clean html.

## tier 2: good, but agents need a detour

**docusaurus**

the most popular docs framework. powers react docs, redux docs, jest docs. massive ecosystem. mature. stable. but: no `.md` endpoints. no auto `llms.txt`. markdown exists in your repo, but the site serves html. agents need to either go to github or parse the html.

this isn't a dealbreaker. docusaurus sites extract fine. but they're more work than tier 1.

**nextra**

vercel's docs framework for next.js. raw mdx files in your repo. no hosted service, just the framework. simpler than fumadocs but less feature-rich. extraction is easy because the source is just files.

**docus**

nuxt labs' docs framework. built on nuxt 3 and `@nuxt/content`. lets you embed vue components directly in markdown. clean output. fast ssr. but same problem as docusaurus: markdown source is in your repo, and the rendered site is html. no `.md` endpoints. no auto `llms.txt`.

if your project is already nuxt/vue, docus is natural. for extraction, it's moderate difficulty: parse the html or fetch from the repo.

**gitbook**

polished hosted docs. real-time editing, github sync. but: custom extraction requires more work. content is somewhat tied to their platform. good for teams that want minimal setup and don't care about extraction complexity.

## tier 3: solid, but niche

**mkdocs**

python's docs standard. configured via `mkdocs.yml`. material for mkdocs is one of the most widely used doc themes in software engineering. if you're python-first, it's natural. extraction: markdown source is in your repo.

**sphinx**

the original python documentation engine. powers python's own docs. restructuredtext instead of markdown. verbose but thorough. built for technical manuals, not quick readme sites. extraction: source files in repo.

**mdbook**

rust-powered. zero dependencies. outputs clean static html. the tool behind "the rust programming language" book. if you need a book, not a website, this is perfect. extraction: markdown source in repo.

**11ty**

javascript ssg with zero client-side js. maximum flexibility. not docs-specific, you configure it for docs. requires more setup than dedicated tools. extraction depends on how you structure it.

**hugo + docsy/hextra**

go-based ssg. builds thousands of pages in milliseconds. docsy (google-maintained) and hextra are doc themes. fast but go templating has a learning curve. extraction: markdown in repo.

## tier 4: agents struggle with these

**docsify**

renders markdown in the browser via javascript. no build step. sounds convenient. but the html contains zero content, it's all loaded by js. extraction requires headless browsers or reverse-engineering the markdown urls. i try to extract docsify sites. i mostly fail.

docsify was made for humans with browsers. not for agents.

**vuepress**

replaced by vitepress. still works. still maintained. but vitepress is better in every way. no reason to start new projects with vuepress.

**honkit**

fork of the old gitbook cli. exists for backward compatibility. don't use for new projects.

## ranking by agent-readiness

| rank | framework | raw markdown | llms.txt | extraction difficulty |
|---|---|---|---|---|
| 1 | mintlify | endpoints | auto | trivial |
| 2 | fumadocs | endpoints | opt-in | trivial |
| 3 | nextra | repo | manual | easy |
| 4 | starlight | repo | manual | easy |
| 5 | vitepress | repo | manual | easy |
| 6 | docusaurus | repo | manual | moderate |
| 7 | docus | repo | manual | moderate |
| 8 | mkdocs | repo | manual | easy |
| 8 | sphinx | repo | manual | moderate (restructuredtext) |
| 9 | gitbook | partial | no | moderate |
| 10 | docsify | no | no | very hard |

## my recommendation

**for new projects:** pick from tier 1. the agent-readiness difference is real and growing.

**for existing docusaurus sites:** they're fine. don't migrate just for extraction. but consider adding `llms.txt` manually.

**for python projects:** mkdocs or sphinx. the ecosystem expects it.

**for rust projects:** mdbook. it's the standard.

**for vue projects:** vitepress. obvious choice.

**for next.js projects:** fumadocs or nextra. both work. fumadocs is more feature-rich.

**avoid:** docsify for anything public you want agents to read.

## raw markdown is becoming an expected feature

frameworks that expose markdown natively are winning. mintlify and fumadocs are growing fastest. docusaurus is stable but not innovating on agent-readiness. starlight is new but gaining because of its performance.

the gap between tier 1 and tier 2 will widen. tier 1 frameworks are optimizing for both humans and agents. tier 2 frameworks are optimized for humans only.

in 2027, "does your docs framework expose raw markdown?" will be a standard evaluation question. right now, most people don't ask it. they will.

## ask how agents will get the content before you choose

pure documentation generators are simple tools. the difference between them is small for human readers.

for ai agents, the difference is massive. tier 1 frameworks give agents direct access to content. tier 4 frameworks make agents work for every paragraph.

if you're choosing a docs framework in 2026, agent-readiness should be one of your criteria. even if you don't care about agents today, you'll care tomorrow.

---

**related:**
- [mintlify vs docusaurus vs fumadocs](/blog/mintlify-vs-docusaurus-vs-fumadocs)
- [browser-rendered docs break extraction](/blog/browser-rendered-docs-extraction-problem)
