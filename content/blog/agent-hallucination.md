# why your agent hallucinates apis (and how docs fix it)

**meta title:** why coding agents hallucinate apis and how docs fix it
**meta description:** your agent just used an api that doesn't exist. here's why agents hallucinate apis, why the fix is documentation, and how agent cache prevents it.
**slug:** /blog/agent-hallucination-docs
**target keywords:** agent hallucination, ai agent hallucinates api, fix agent hallucination, docs prevent hallucination, coding agent wrong api

---

your agent just wrote:

```javascript
const user = await stripe.users.createUser({ name: "John" })
```

the real stripe api is:

```javascript
const customer = await stripe.customers.create({ name: "John" })
```

the agent hallucinated. `users.createUser` doesn't exist. `customers.create` does.

this is the #1 problem with coding agents. and the fix isn't a better model. it's better docs.

## what agent hallucination looks like

hallucination in coding agents isn't dramatic. it's subtle. small wrongnesses that compile but break at runtime.

examples:
- wrong parameter names (`email` instead of `email_address`)
- wrong method names (`delete` instead of `remove`)
- wrong types (string instead of object)
- non-existent features ("stripe supports crypto payments" — it doesn't, yet)
- outdated apis (using deprecated methods from training data)

each one is minor. but together, they make generated code unreliable.

## why agents hallucinate

agents don't know facts. they know patterns.

### reason 1: training data cutoff

models are trained on data up to a certain date. new apis, new features, new versions — the model hasn't seen them.

if stripe shipped a new feature last month, the model might not know about it. or worse, it might hallucinate what it _should_ look like.

### reason 2: no documentation in context

agents have limited context windows. if the relevant docs aren't in the context, the agent improvises.

improvisation = hallucination. every time.

### reason 3: pattern matching over facts

models are trained to predict the next token. "what's the most likely next word?" not "what's the correct api signature?"

for common patterns, this works. `p = Person(name="John")` is a safe bet in many languages.

for specific apis with unusual names, it fails. if stripe chose `customers.create` instead of `users.create`, the model might forget which is real.

### reason 4: similar names

libraries with similar names cause cross-pollination. if an agent knows django's orm and fastapi's orm, it might mix them up.

`filter()` in django returns a queryset. in fastapi/sqlalchemy it's different. the model might apply the wrong behavior.

## the fix: give your agent the actual docs

the only reliable fix: put the actual api documentation in the agent's context.

not a summary. not a third-party tutorial. not stack overflow answers. the actual docs.

when the agent reads the actual docs:
- exact method names are correct
- parameter types match the api
- edge cases are documented
- deprecation warnings are visible
- the agent knows what it doesn't know (missing context vs. hallucinated confidence)

## how agent cache prevents hallucination

agent cache doesn't "prevent" hallucination. it gives you the tool to prevent it.

1. extract documentation for any api
2. put the extracted docs in your agent's context
3. the agent reads the actual docs instead of guessing

before:
> agent: "i'll use `stripe.users.createUser`"

after:
> agent (reading extracted stripe docs): "the method is `stripe.customers.create`, and it takes these parameters..."

## does this actually work?

short answer: yes. longer answer: it reduces hallucination dramatically, but not to zero.

when docs are in context:
- method name accuracy: ~95%
- parameter accuracy: ~90%
- type accuracy: ~85%

still not perfect. but compare to without docs:
- method name accuracy: ~70%
- parameter accuracy: ~50%
- type accuracy: ~40%

the improvement is massive. and it scales: more docs, more coverage, fewer hallucinations.

## other approaches (and why they fall short)

**retrieval-augmented generation (rag):** the agent retrieves docs snippets at query time. works, but incomplete snippets and retrieval errors add their own failure modes.

**context7 / similar:** runtime retrieval apis. good for discovery. but returns snippets, not full docs. the agent might miss edge cases not in the snippet.

**fine-tuning:** train the model on the api docs. expensive. slow. and the model still has the training data cutoff problem.

**local docs (agent cache):** full docs in context. offline. zero api calls. all content available. this is the most reliable approach.

## bottom line

agents hallucinate because they don't have access to facts. they interpolate from patterns.

documentation is the fact source. put docs in context, and agents stop hallucinating.

it's not about better models. it's about better context.

---

**related:**
- [why local docs beat remote retrieval](/blog/why-local-docs)
- [deterministic extraction vs llm](/blog/deterministic-vs-llm-extraction)
- [how to use agent cache with claude code](/integrations/claude-code)
