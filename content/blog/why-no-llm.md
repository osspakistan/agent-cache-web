# where LLMs fit in documentation extraction

**meta title:** where LLMs fit in documentation extraction
**meta description:** Documentation should preserve source text accurately. Here's why I started with deterministic extraction and where LLM-assisted organization or retrieval may help.
**slug:** /blog/why-no-llm-extraction
**target keywords:** deterministic documentation extraction, llm-assisted documentation, llm vs deterministic extraction, source-faithful docs, documentation organization

---

I started Agent Cache with deterministic extraction because the first job is to preserve the source documentation, including exact API names and code examples. I’m validating the product now, so I’m also testing where an LLM could make the resulting bundle easier to organize or use.

Sending a whole documentation site to a model and asking it to rewrite everything is one possible approach, but it risks changing details that should stay exact.

That does not mean LLMs have no place in the product. It means source capture and model-assisted features have different jobs: extraction should preserve what the docs say, while a model may help with discovery, grouping, or navigation when that adds value.

## what llms are actually good at

llms are great at:
- understanding natural language
- generating creative content
- summarizing long texts
- answering questions
- reasoning across domains

These capabilities may help with tasks around documentation, such as finding relevant pages or suggesting useful labels.

## what docs extraction actually needs

Source capture needs to preserve page content, including exact API signatures and code examples. A useful bundle also needs clear structure and a way to find relevant pages.

Using a model to rewrite source pages can make these requirements harder to guarantee, so any model-assisted step should be bounded and checked against the original text.

## cost and latency depend on the task

Converting every page through a model adds model calls and depends on the chosen model, page size, and output length. Direct Markdown or HTML conversion can avoid those calls. A smaller task such as suggesting labels or grouping pages may have a different cost and response time, so I’ll evaluate those separately.

## problem 3: determinism

determinism means: same input, same output, every time.

this is critical for agent cache. if you extract the same docs site twice, you should get the same zip file. your agent should see the same documentation.

Model output can vary between runs. If the model rewrites source pages, small changes to headings, code, or wording can make it harder to compare bundles. Keeping the original text intact avoids relying on a model to reproduce it.

for a reference pipeline, randomness is a bug, not a feature.

## problem 4: completeness

Models have context limits, so a large site would need to be split into smaller requests. If a model is asked to summarize or rewrite pages, it may omit details. Keeping the source pages available makes those omissions easier to catch and lets an agent consult the original.

## problem 5: hallucination

When asked to generate or rewrite technical content, a model can introduce errors. For example, it might:
- rename an api parameter (because the real name is "confusing")
- skip a deprecated method (because "nobody uses it")
- add fake parameters to "improve" the api
- change code examples to "cleaner" versions that don't actually work

That risk matters when a coding agent relies on exact API behavior. Any generated guidance should be checked against the source documentation.

## metadata and organization can use semantic help

metadata generation.

after extraction, agent cache generates `meta.yaml` with:
- name, description, url
- repository
- keywords (8-12 technical search tokens)
- intent_triggers (4-6 natural user questions)
- ecosystem (4-8 related tools)

Metadata such as topic labels and intent triggers benefits from semantic understanding. A model can suggest these after extraction, while the original Markdown remains available for comparison.

That is one candidate use for an LLM; the cost, quality, and need for review should be validated with real users and sites.

## keep source extraction separate from model-assisted features

agent cache uses pure code:
- regex for url patterns
- jsdom for html parsing
- turndown for markdown conversion
- framework-specific extractors for nav/tab/version structures
- simple string operations for cleaning

The initial extraction path uses ordinary code for parsing and conversion. That gives us a baseline to compare against if we add model-assisted features.

This is the deterministic baseline. It gives us a source bundle to compare with any LLM-assisted discovery or organization feature.

## when an llm would make sense

Potential uses to validate include suggesting groups for pages, helping users find a relevant page, and recovering useful structure when a site's navigation is unclear. Those features should point back to the original Markdown so users can inspect the source.

## preserve source text, then test model assistance where useful

Documentation extraction needs to preserve the source. Organization and retrieval can benefit from interpretation, if a model can improve the experience without obscuring or altering that source.

The extraction step turns source pages into Markdown. LLM-assisted features could then interpret that content to improve discovery, without replacing the source files.

The product direction is still being tested. I’m keeping exact source capture as a requirement while exploring whether LLM-assisted organization or retrieval helps developers get useful documentation into their coding agent's context sooner.

---

**related:**
- [deterministic extraction vs llm summarization](/blog/deterministic-vs-llm-extraction)
- [the deterministic extraction baseline](/blog/acquisition-ladder)
- [html extraction: how i clean docs](/blog/html-to-markdown-extraction)
