# why agent cache is going open source (and what that means)

**meta title:** agent cache is going open source. here's why.
**meta description:** i'm open sourcing the agent cache extraction engine under mit. here's what that means and why i did it.
**slug:** /blog/open-source-direction
**target keywords:** agent cache open source, open source documentation extraction, mit license docs tool, open source crawler, agent cache github

---

agent cache is going open source.

the extraction engine. the cli. the mcp server. all of it.

under mit license. free to use. free to modify. free to fork.

## charging for public docs extraction feels wrong

charging for docs extraction feels wrong.

documentation is public information. it's meant to be read. wrapping it in a paywall feels like charging for library access.

open source aligns with that: the tool is free. anyone can extract docs.

## what's open source

these components will be open sourced:
- **extraction engine**: the core crawler, framework extractors, acquisition ladder
- **cli**: `agentcache add <url>`, `agentcache list`, etc.
- **mcp server**: serves local docs to agents via model context protocol
- **utility libraries**: url normalization, html cleaning, etc.

## what's not open source

these stay proprietary:
- **web app** (`agentcache.run`): the hosted service
- **infrastructure**: deployment, monitoring, billing
- **branding**: name, logo, domain

## why the split

the extraction technology is a public good. it should be open. anyone should be able to extract docs.

the hosted service is my business. convenience, reliability, and support.

this is a common model. linux is open source. red hat sells support. wordpress is open source. wordpress.com sells hosting.

## what mit means

mit license is the most permissive:
- use for commercial projects
- modify and redistribute
- include in proprietary software
- no attribution required (but appreciated)
- no warranty

basically: do whatever you want. just don't blame me if something breaks.

## what it means for users

**as a free user:** nothing changes. the web app stays free.

**as a self-hoster:** you can run the extraction engine locally. no dependency on my infrastructure. extract docs on your own server.

**as a developer:** you can modify the extraction logic. add support for new frameworks. integrate into your own tools.

**as a competitor:** you can fork it. build your own product. i can't stop you and don't want to. the extraction itself is not a moat.

## hosting is what i'd charge for

the hosted service. convenience. zero setup. reliability.

if you want to "just extract docs," the web app is faster than self-hosting.

if you need to extract docs at scale, in a pipeline, or inside your own infrastructure, the open source engine is for you.

## timeline

1. **now:** extraction engine code is being cleaned up for release
2. **soon:** public github repo with core extraction code
3. **later:** cli and mcp server released
4. **eventually:** web app stays as hosted service

## open the engine, sell the convenience

the technology to extract docs should be free and open. the service to make it convenient can be monetized.

i open source the tool. i sell the convenience.

---

**related:**
- [agent cache architecture](/blog/architecture-deep-dive)
