import { watch } from 'node:fs'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'

const WS_PORT = 10902
const activeSockets = new Set<any>()

// WebSocket server for browser auto-refresh
Bun.serve({
  port: WS_PORT,
  fetch(req, server) {
    if (server.upgrade(req)) {
      return
    }
    return new Response('Hot reload server', { status: 200 })
  },
  websocket: {
    open(ws) {
      activeSockets.add(ws)
    },
    close(ws) {
      activeSockets.delete(ws)
    },
    message() {},
  },
})

console.log(`[hot-reload] Live reload WebSocket server listening on :${WS_PORT}`)

let child: ChildProcess | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function notifyClients() {
  for (const ws of activeSockets) {
    try {
      ws.send('reload')
    } catch {}
  }
}

function startServer(isRestart = false) {
  if (child) {
    try {
      child.kill('SIGTERM')
    } catch {}
  }

  console.log('[dev] Starting HTTP server...')
  child = spawn('bun', ['run', 'src/index.tsx'], {
    stdio: 'inherit',
    env: { ...process.env, DEV_HOT_RELOAD: 'true' },
  })

  child.on('exit', (code, signal) => {
    if (signal !== 'SIGTERM' && signal !== 'SIGKILL' && code !== null && code !== 0) {
      console.log(`[dev] Server exited with code ${code}`)
    }
  })

  if (isRestart) {
    // Give the HTTP server ~300ms to bind, then tell connected browser tabs to reload
    setTimeout(() => {
      notifyClients()
    }, 350)
  }
}

function restartServer(file?: string) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    console.log(`\n[dev] Change detected in ${file || 'files'}, restarting server...`)
    startServer(true)
  }, 150)
}

// Watch src/ and public/ recursively
watch('./src', { recursive: true }, (event, filename) => {
  if (filename) restartServer(`src/${filename}`)
})

watch('./public', { recursive: true }, (event, filename) => {
  if (filename) restartServer(`public/${filename}`)
})

startServer(false)

process.on('SIGINT', () => {
  if (child) child.kill()
  process.exit(0)
})

process.on('SIGTERM', () => {
  if (child) child.kill()
  process.exit(0)
})
