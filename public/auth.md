# auth.md

Welcome to **Agent Cache** (`https://agentcache.run`).

This document outlines authentication, registration, and discovery procedures for automated AI agents per the [Auth.md](https://workos.com/auth-md) specification.

## Public Access & No-Auth Endpoints

Most core Agent Cache endpoints are open and do not require authorization:
- `GET /health` - Service health status
- `GET /openapi.json` - Full OpenAPI 3.0 specification
- `GET /llms.txt` - LLM-friendly index
- `GET /llms-full.txt` - Full content text
- `GET /api/jobs` - List recently completed doc bundles
- `GET /api/jobs/{id}` - Inspect job details and progress
- `GET /api/jobs/{id}/tree` - Inspect job navigation tree
- `POST /api/probe` - Test doc site crawl strategy
- `POST /api/jobs` - Submit docs site crawl job (free tier default)

## Authentication Metadata

For protected agent workflows or higher-throughput authenticated tier limits:
- **Protected Resource Metadata**: `/.well-known/oauth-protected-resource` (RFC 9728)
- **Authorization Server Metadata**: `/.well-known/oauth-authorization-server` (RFC 8414)
- **Token Type**: Bearer tokens passed via HTTP `Authorization: Bearer <token>` header.

## Registration Endpoints

Agents can register or provision access credentials programmatically:
- **Registration URI**: `https://agentcache.run/api/agent/register`
- **Supported Identity Types**: `anonymous`, `identity_assertion`
- **Supported Assertion Types**: `urn:ietf:params:oauth:token-type:id-jag`, `verified_email`
- **Scopes**: `docs:read`, `docs:crawl`, `docs:write`

For developer inquiries or key issues, contact `hi@agentcache.run`.
