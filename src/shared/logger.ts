/**
 * Logger — evlog, initialized once at boot.
 * The Hono middleware (evlog()) attaches a request-scoped logger to c.get('log')
 * and emits one wide event per request. Workers (job runner) get their own
 * forked/plain logger once the pipeline exists.
 */
import { initLogger } from 'evlog'

initLogger({
  env: { service: 'agent-cache-web' },
})
