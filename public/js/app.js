/**
 * Theme toggle + persistent 'ac-theme' key (shared with logo preview).
 * No form-capture JS — the pill form is real: hx-post → /jobs/create fragment.
 */
(function () {
  var toggle = document.getElementById('theme-toggle')
  if (!toggle) return
  function label() {
    toggle.textContent =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  }
  toggle.addEventListener('click', function () {
    var t =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = t
    localStorage.setItem('ac-theme', t)
    label()
  })
  label()
})()

/**
 * Client-Side Logger for Agent Cache:
 * - Dual-layer messaging: human explanations for UX vs machine details for debugging.
 * - Red styled console logs for debug mode.
 * - Automatic transmission of client events to /api/logs for evlog ingestion.
 */
;(function () {
  var isDebugMode =
    window.location.search.indexOf('debug=1') !== -1 ||
    localStorage.getItem('ac-debug') === 'true'

  function sendToServer(payload) {
    try {
      var data = JSON.stringify(payload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/logs', new Blob([data], { type: 'application/json' }))
      } else {
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true,
        }).catch(function () {})
      }
    } catch (e) {}
  }

  window.acLogger = {
    isDebug: function () {
      return isDebugMode
    },
    setDebug: function (enabled) {
      isDebugMode = !!enabled
      localStorage.setItem('ac-debug', isDebugMode ? 'true' : 'false')
      console.log(
        '%c[AC:LOGGER] Debug mode ' + (isDebugMode ? 'ENABLED' : 'DISABLED'),
        'color: #3b82f6; font-weight: bold;',
      )
    },
    debug: function (topic, message, meta) {
      // Red console styling for debug logs as requested
      console.log(
        '%c[DEBUG] ' + topic + ': ' + message,
        'color: #ef4444; font-weight: 700; background: rgba(239, 68, 68, 0.1); padding: 2px 6px; border-radius: 4px;',
        meta || '',
      )
      sendToServer({
        level: 'debug',
        group: 'client_debug',
        topic: topic,
        human: message,
        meta: meta,
        url: window.location.href,
        timestamp: Date.now(),
      })
    },
    info: function (topic, message, meta) {
      console.log(
        '%c[INFO] ' + topic + ': ' + message,
        'color: #10b981; font-weight: 600;',
        meta || '',
      )
      sendToServer({
        level: 'info',
        group: 'client_ui',
        topic: topic,
        human: message,
        meta: meta,
        url: window.location.href,
        timestamp: Date.now(),
      })
    },
    warn: function (topic, message, meta) {
      console.warn(
        '%c[WARN] ' + topic + ': ' + message,
        'color: #f59e0b; font-weight: 600;',
        meta || '',
      )
      sendToServer({
        level: 'warn',
        group: 'client_warn',
        topic: topic,
        human: message,
        meta: meta,
        url: window.location.href,
        timestamp: Date.now(),
      })
    },
    error: function (topic, human, machine, meta) {
      // Keep machine errors separate from human error
      console.error(
        '%c[CLIENT ERROR] ' + topic + ': ' + human,
        'color: #dc2626; font-weight: 700;',
        { human: human, machine: machine, meta: meta },
      )
      sendToServer({
        level: 'error',
        group: 'client_error',
        topic: topic,
        human: human,
        machine: typeof machine === 'string' ? machine : JSON.stringify(machine),
        meta: meta,
        url: window.location.href,
        timestamp: Date.now(),
      })
    },
  }

  // Intercept uncaught browser errors and send to evlog
  window.addEventListener('error', function (e) {
    window.acLogger.error(
      'window.onerror',
      'An unexpected browser script issue occurred.',
      e.message + ' at ' + e.filename + ':' + e.lineno + ':' + e.colno,
      { stack: e.error ? e.error.stack : null },
    )
  })

  // Intercept unhandled promise rejections
  window.addEventListener('unhandledrejection', function (e) {
    window.acLogger.error(
      'unhandledrejection',
      'An asynchronous client operation failed.',
      e.reason ? e.reason.message || String(e.reason) : 'Unknown rejection',
      { stack: e.reason && e.reason.stack ? e.reason.stack : null },
    )
  })
})()

