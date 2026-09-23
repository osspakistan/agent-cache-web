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

For protected agent workflows or higher-throughput authenticated tier limits, inspect the OAuth discovery endpoints:
- **Protected Resource Metadata**: [/.well-known/oauth-protected-resource](https://agentcache.run/.well-known/oauth-protected-resource) (RFC 9728)
- **Authorization Server Metadata**: [/.well-known/oauth-authorization-server](https://agentcache.run/.well-known/oauth-authorization-server) (RFC 8414)
- **OpenID Configuration**: [/.well-known/openid-configuration](https://agentcache.run/.well-known/openid-configuration)
- **Token Type**: Bearer tokens passed via HTTP `Authorization: Bearer <token>` header.

## Registration Endpoints

Agents can register or provision access credentials programmatically:
- **Registration URI**: `https://agentcache.run/api/agent/register`
- **Claim URI**: `https://agentcache.run/api/agent/claim`
- **Revocation URI**: `https://agentcache.run/api/agent/revoke`
- **Supported Identity Types**: `anonymous`, `identity_assertion`
- **Supported Assertion Types**: `urn:ietf:params:oauth:token-type:id-jag`, `verified_email`
- **Supported Credential Types**: `api_key`
- **Scopes**: `docs:read`, `docs:crawl`, `docs:write`

### Registration Flows

#### 1. Anonymous Registration
- Submit POST to `https://agentcache.run/api/agent/register` with:
  ```json
  { "identity_type": "anonymous" }
  ```
- Receive provisional token or claim challenge, then claim credentials via `POST https://agentcache.run/api/agent/claim`.

#### 2. ID-JAG (Identity Assertion)
- Submit POST to `https://agentcache.run/api/agent/register` with:
  ```json
  {
    "identity_type": "identity_assertion",
    "assertion_type": "urn:ietf:params:oauth:token-type:id-jag",
    "assertion": "<jwt-assertion>"
  }
  ```

#### 3. Verified Email
- Submit POST to `https://agentcache.run/api/agent/register` with:
  ```json
  {
    "identity_type": "identity_assertion",
    "assertion_type": "verified_email",
    "email": "agent-operator@example.com"
  }
  ```
- Complete email verification and claim credentials at `https://agentcache.run/api/agent/claim`.

### Credential Usage

Include the provisioned `api_key` or OAuth access token in the `Authorization` HTTP header for all protected API calls:
```http
Authorization: Bearer <token>
```

For developer inquiries or key issues, contact `hi@agentcache.run`.
