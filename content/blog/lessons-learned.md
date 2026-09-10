# 30 lessons learned from building a documentation extraction tool

**meta title:** 30 lessons from extracting 100+ docs sites
**meta description:** after extracting 100+ documentation sites and building agent cache, here are 30 lessons about docs, agents, and extraction.
**slug:** /blog/30-lessons-docs-extraction
**target keywords:** lessons learned documentation, building documentation tool, docs extraction lessons, documentation crawler lessons, building agent tool

---

i've extracted 100+ docs sites. hit cloudflare walls. debugged .md.md bugs. built the entire pipeline. here are 30 lessons.

## lessons 1-10: about documentation

1. **most docs sites expose raw markdown.** 61% of modern docs have `.md` endpoints, `llms.txt`, or github repos. scraping is the fallback.

2. **docs sites redesign frequently.** html selectors break. framework extractors need updates. extraction is maintenance, not a one-time thing.

3. **version selectors are the hardest ui element to handle.** tabs, dropdowns, sidebar toggles. all invisible to simple extractors.

4. **code blocks are fragile.** some frameworks split them across divs. some use custom syntax highlighting. some embed code in data attributes.

5. **navigation is the most useful structure.** the page tree tells agents how docs relate. but it's often hidden in javascript or json apis.

6. **mobile and desktop versions differ.** some sites serve different content. responsive design hides content with `display: none`. extraction needs desktop user-agents.

7. **search functionality is never extractable.** search needs a backend. the frontend is just a query box. i ignore search.

8. **images and diagrams are usually outside the scope.** i focus on text and code. visual content is hard to convert meaningfully.

9. **the "pretty" docs site is often a skin.** the real content is markdown or json underneath. the rendered html is just one view.

10. **docs quality varies massively.** some are clean, structured, well-maintained. others are outdated, broken-link-ridden messes.

## lessons 11-20: about extraction

11. **framework detection is 80% of the work.** once you know the framework, you know the selectors. everything else follows.

12. **html purification never produces perfect output.** there's always some noise. the goal is "good enough for agents," not "pixel perfect."

13. **rate limiting is the biggest practical challenge.** not parsing. not conversion. just getting permission to fetch the pages.

14. **headless browsers would solve most extraction problems.** but they're 10x slower, 10x heavier, and unreliable at scale. i avoid them.

15. **github tree api is the fastest extraction method.** when it works, nothing else comes close. always check for open-source docs repos.

16. **custom frameworks are the most time-consuming.** every company that builds its own docs framework requires bespoke extraction logic.

17. **direct .md endpoints are the most reliable.** mintlify, fumadocs, and others serve clean markdown. no parsing needed.

18. **content negotiation is underrated.** `Accept: text/markdown` works on some sites. they just don't advertise it.

19. **crawling ethics matter.** respecting robots.txt and rate limits isn't just polite. it prevents your ip from being permanently blocked.

20. **the 80/20 rule applies.** 80% of sites extract cleanly with simple rules. 20% need complex handling. but that 20% takes 80% of the time.

## lessons 21-30: about building developer tools

21. **htmx + hono is a surprisingly capable stack.** no react. no build step. fast, simple, reliable.

22. **zero-memory architecture works.** stream everything to disk. replay events from a log. crash recovery is built in.

23. **dual-layer error messages are worth the effort.** clear user messages + verbose debug logs. both audiences served.

24. **open source is the right business model.** the extraction tool is free. the hosted service is convenient.

25. **vps beats serverless for crawling.** cloudflare workers' 50 subrequest limit made serverless impractical. a $6 vps handles everything.

26. **turso (sqlite) handles metadata fine.** no postgres needed for simple relational data. sqlite is enough.

27. **r2 saves money on downloads.** zero egress fees vs. s3's 9 cents/gb. for zip-file downloads, that matters.

28. **user experience matters more than features.** a clean form + status page + download button beats a dozen half-finished features.

29. **marketing is harder than engineering.** the product works. distribution doesn't. seo content is my strategy.

30. **docs extraction should be free.** charging for access to public documentation is wrong. open source extraction ensures it stays free.

## raw markdown was already there on 61% of sites

the number of sites that already expose raw markdown. 61%. the frameworks are designed for it. developers built it in. i just need to know where to look.

## finding the right extraction path took the most work

not extraction. not parsing. not html cleaning.

it's **discovering the right extraction path.** given a random docs url, which tier of the ladder works? that's 80% of the complexity.

## what i'd do differently

1. **spend more time on framework detection.** early versions had generic extraction. adding framework-specific extractors improved quality 10x.

2. **start with the cdn/github paths.** i initially built html extraction first. reversing the order would have been faster.

3. **build meta.yaml early.** metadata is what makes docs useful to agents. without it, it's just a folder of markdown files.

## public docs still aren't always fetchable

building a docs extraction tool taught me more about how documentation works than i expected.

the diversity of docs frameworks. the creativity of web development. the gap between "publicly readable" and "programmatically accessible."

but also: most docs authors want their content to be accessible. they just need the right tools.

agent cache is one of those tools.

---

**related:**
- [100 sites extracted: what broke](/blog/100-docs-sites-what-broke)
- [choosing an extraction path, cheapest first](/blog/acquisition-ladder)
- [agent cache architecture](/blog/architecture-deep-dive)
