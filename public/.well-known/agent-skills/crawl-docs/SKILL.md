---
name: crawl-docs
description: Submit a docs site URL to Agent Cache and retrieve a clean, agent-ready markdown zip bundle.
---

# Crawl Docs Skill

Use this skill to package any documentation site into markdown for LLM and agent context.

## API Usage

1. Probe the docs site:
   `POST https://agentcache.run/api/probe` with `{"url": "https://example.com/docs"}`
2. Submit crawl job:
   `POST https://agentcache.run/api/jobs` with `{"url": "https://example.com/docs"}`
3. Retrieve job tree and status:
   `GET https://agentcache.run/api/jobs/{id}`
4. Download the resulting zip bundle:
   `GET https://agentcache.run/docs/{id}/download`
