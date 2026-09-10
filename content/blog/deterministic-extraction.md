# deterministic extraction beats llm-powered summarization

**meta title:** deterministic vs llm extraction: why i use zero ai for docs
**meta description:** llms summarize. deterministic extraction preserves. for documentation, you need the whole thing, not an ai's interpretation. here's why code wins.
**slug:** /blog/deterministic-vs-llm-extraction
**target keywords:** deterministic extraction, llm summarization vs extraction, reliable documentation extraction, non-llm extraction, extraction determinism

---

llms are amazing. they understand text. they generate content. they answer questions. they summarize.

but for documentation extraction, summarization is the problem, not the solution. you don't want your api docs summarized. you want them preserved.

## what deterministic means

deterministic: same input → same output. always.

this isn't a nice-to-have for docs. it's required.

imagine an agent that references docs. today the docs say `function createUser(opts)`. tomorrow, after re-extraction, it says `function createUser(options)`.

nothing changed in the actual api. the llm just interpreted the source differently. your agent is confused.

## problem 1: llms summarize

llms are trained to be helpful. helpful means concise. concise means summarization.

when an llm extracts documentation, it might:
- combine two functions into one "see also" reference
- skip "obvious" parameters
- rewrite examples to be "clearer"
- omit deprecated methods as "unnecessary"

for a human reader, this might be fine. for an agent writing code against an api, this is catastrophic.

## problem 2: llms hallucinate

llms invent things. confidently.

in a documentation context, hallucination means:
- fake parameter names
- non-existent methods
- wrong types
- imaginary return values

i tested this. gave gpt-4 a stripe api docs page and asked it to extract the signatures. it correctly identified most functions. but it confidently reported one parameter as optional when it was required. and it added a fake parameter that doesn't exist.

one error in a thousand lines might not matter. but in code generation, one wrong parameter name breaks everything.

## problem 3: non-deterministic output

temperature 0 doesn't fix it. modern llms still produce slightly different outputs for the same input.

reasons:
- random sampling at the token level
- differences in context window formatting
- model updates between calls

for creative work, this is fine. for documentation, it's a bug.

## problem 4: speed and cost

an llm call for docs extraction: 30 seconds per page. $0.02 per page.

for 100 pages: 50 minutes. $2.

my approach: 1 second per page (direct .md). or 10 seconds per page (html purification).

for 100 pages: 2-15 minutes. $0.

llms are 60x slower and infinitely more expensive.

## problem 5: context limits

llms have limited context windows. 128k tokens is ~100 pages of dense docs.

what about sites with 500 pages? 1,000 pages? you chunk them. process independently. lose cross-page references. lose navigation structure.

my approach handles thousands of pages. just files on disk. no limits.

## i use an llm for metadata after extraction

i do use an llm. for `meta.yaml` generation. after extraction is complete.

why? because keywords and intent triggers are subjective. they require semantic understanding of what the library does. code can't generate good keywords. an llm can.

this is one llm call per site. cheap. and the output is reviewed.

## what my extraction looks like

code. pure code.

- regex for url patterns
- jsdom for html parsing
- framework-specific selectors for content areas
- turndown for html-to-markdown conversion
- string operations for cleaning

no neural networks. no embeddings. no vector stores.

## when llms do make sense

llms are useful for extraction problems that require interpretation:
- sentiment analysis of documentation tone
- inferring relationships between code and docs
- generating summaries (for human consumption, not agent consumption)
- classifying uncategorized docs

but none of these are in the critical path. they're niceties, not requirements.

## html to markdown is a transformation, not a judgment call

ai is for fuzzy problems. extraction is not fuzzy. it's deterministic transformation.

html → markdown. noisy → clean. unstructured → structured.

code does this perfectly. llms add noise, cost, and unreliability.

## keep llms out of the extraction path

if you're building a docs extraction pipeline, skip the llm. use code. deterministic extraction is faster, cheaper, and more reliable.

use llms for what they're good at: understanding, reasoning, creativity.

don't use them for what code does better: transformation.

---

**related:**
- [why i don't use llms for extraction](/blog/why-no-llm-extraction)
- [how i look for raw markdown first](/blog/acquisition-ladder)
- [html extraction how-to](/blog/html-to-markdown-extraction)
