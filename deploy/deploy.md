---
description: Deploy agent-cache-web to production server
---

# Deployment Instructions

Deploy the agent-cache-web Bun + Hono app to production using Docker + Caddy reverse proxy.

## Important

This is NOT a git-based deployment. Git has nothing to do with deployment. Do not use git commands (git log, git status, git diff, etc.) during deployment. Do not fetch commit hashes.

## What gets copied to server

Only production-relevant files. The Dockerfile references these — nothing else is needed:

| Path | Purpose |
|---|---|
| `src/` | Backend code (Hono, engine, lib, router) |
| `public/` | Frontend assets (CSS, JS, fonts, logos) |
| `content/` | Blog + compare articles (required — read by src/lib/content.ts) |
| `package.json` | Dependencies |
| `bun.lock` | Lockfile |
| `deploy/` | Docker + Caddy config |
| `.env` | Production secrets |

**Do NOT copy:** `.wtf/`, `.agentcache/`, `.git/`, `node_modules/`, `storage/`, `docs/`, `experiments/`, reports.

> ⚠️ **`content/` must ship.** It is the source for `/blog` and `/compare`. Do NOT add
> `--exclude='content'` to the rsync, and NEVER remove `COPY content/ ./content/` from the
> Dockerfile. The site serves empty blog/compare pages if it's missing.

## CRITICAL: Step 0 - Verify MCP Connection

Before doing ANYTHING else, you MUST call the MCP tool to verify server access:

Call `hands-on-server___run_command` with:
- command: `echo "MCP connected"`

If this call fails or the tool is not available:
- STOP immediately
- Tell the user: "MCP tools not available. Cannot deploy."
- Do NOT proceed with any other steps

## CRITICAL: Step 1 - Check Server State

After MCP is connected, check the server yourself:

Call `hands-on-server___run_command` with:
- command: `docker ps --filter "name=agent-cache" && ls /var/www/agent-cache-project/agent-cache-web/ 2>/dev/null || echo "FOLDER_NOT_FOUND"`

This tells you:
- If container exists → Redeploy
- If no container or folder not found → First-time deployment

## Tools

### MCP Tools
Use `hands-on-server` MCP tools for server-side operations:
- `run_command` - Execute shell commands on server
- `read_file` - Read file contents on server
- `write_file` - Write/create files on server (for small configs, not file transfers)
- `list_dir` - List directory contents on server
- `restart_service` - Restart systemd services
- `system_status` - Check server memory, disk, CPU

### System Commands
Use `Execute` tool for common bash commands:
- File transfers: `scp`, `rsync`
- Local file reading: `cat`, `ls`
- Any standard bash command

### Principle
- MCP = server-side operations
- Execute = local operations + transfers
- Use whichever tool fits the situation

## Server Details

- Location: `/var/www/agent-cache-project/agent-cache-web`
- Caddy sites: `/etc/caddy/sites/`
- Domain: `agentcache.run`
- Port: 10901
- Deployment log: `/var/www/agent-cache-project/agent-cache-web-deployment.toml`

---

## First-time Deployment

### 1. Copy production files to server

Only copy what the Dockerfile needs:

```bash
# Create target directory
ssh -p 2222 root@161.97.122.33 'mkdir -p /var/www/agent-cache-project/agent-cache-web'

# Copy production files (exclude dev/research files)
# ⚠️ Do NOT add --exclude='content' here — content/ (blog+compare) MUST ship, or /blog & /compare go empty.
rsync -avz -e 'ssh -p 2222' \
  --exclude='.wtf' \
  --exclude='.agentcache' \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='storage' \
  --exclude='docs' \
  --exclude='.pi' \
  --exclude='.codegraph' \
  --exclude='report.html' \
  --exclude='skills-lock.json' \
  ./ root@161.97.122.33:/var/www/agent-cache-project/agent-cache-web/
```

### 2. Create .env on server

```bash
scp -P 2222 deploy/.env root@161.97.122.33:/var/www/agent-cache-project/agent-cache-web/.env
```

### 3. On server: build and start Docker container

```bash
cd /var/www/agent-cache-project/agent-cache-web
docker compose -f deploy/compose.yml up --build -d
```

### 4. On server: setup Caddy site (first-time only)

```bash
cp /var/www/agent-cache-project/agent-cache-web/deploy/agentcache.caddy /etc/caddy/sites/agentcache.caddy
mkdir -p /var/log/caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

### 5. Verify Health

**From server (MCP):**
- Direct: `curl http://localhost:10901/health`
- Via Caddy: `curl https://agentcache.run/health`

**From local machine (Execute):**
- Via Caddy: `curl -s https://agentcache.run/health`

Both must return healthy.

### 6. Log deployment

---

## Redeploy (Every deployment follows this pattern)

Every deploy is a clean redeploy: stop container → delete old files → copy fresh files → rebuild → start. No in-place updates.

### 1. On server: stop and remove container

```bash
cd /var/www/agent-cache-project/agent-cache-web
docker compose -f deploy/compose.yml down --rmi all
```

### 2. Delete old project files (keep .env if unchanged)

```bash
rm -rf /var/www/agent-cache-project/agent-cache-web
mkdir -p /var/www/agent-cache-project/agent-cache-web
```

### 3. Copy fresh production files to server

Only copy what the Dockerfile needs:

```bash
# ⚠️ Do NOT add --exclude='content' here — content/ (blog+compare) MUST ship, or /blog & /compare go empty.
rsync -avz -e 'ssh -p 2222' \
  --exclude='.wtf' \
  --exclude='.agentcache' \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='storage' \
  --exclude='docs' \
  --exclude='.pi' \
  --exclude='.codegraph' \
  --exclude='report.html' \
  --exclude='skills-lock.json' \
  ./ root@161.97.122.33:/var/www/agent-cache-project/agent-cache-web/
```

### 4. Copy .env to server

```bash
scp -P 2222 deploy/.env root@161.97.122.33:/var/www/agent-cache-project/agent-cache-web/.env
```

### 5. On server: build and start Docker container

```bash
cd /var/www/agent-cache-project/agent-cache-web
docker compose -f deploy/compose.yml up --build -d
```

### 6. On server: update Caddy site config (if changed)

```bash
cp /var/www/agent-cache-project/agent-cache-web/deploy/agentcache.caddy /etc/caddy/sites/agentcache.caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

### 7. Verify Health

**From server (MCP):**
- Direct: `curl http://localhost:10901/health`
- Via Caddy: `curl https://agentcache.run/health`

**From local machine (Execute):**
- Via Caddy: `curl -s https://agentcache.run/health`

Both must return healthy.

### 8. Log deployment

---

## Known Issues

### SSE Timeout
Agent Cache uses Server-Sent Events (SSE) for real-time job progress. The Caddy config includes `read_timeout 300s` and `write_timeout 300s` to handle long-lived connections. If you see clients disconnecting, check these timeouts.

### .env Secrets Redacted
The `Read` tool redacts sensitive values. Use SCP to transfer .env, never write directly.

### Caddy Config Errors
If Caddy won't reload, validate config first:
```bash
caddy validate --config /etc/caddy/Caddyfile
```

---

## Rules

1. Ask for confirmation before each major step
2. Show the user what command you're about to run
3. Report results after each step
4. If something fails, stop and report the error
5. Never expose secrets in logs or messages
