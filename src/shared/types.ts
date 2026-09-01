/**
 * App-wide Hono typing. Every route/fragment/module uses AppContext so
 * context variables (evlog's request logger) are typed end to end.
 */

import type { EvlogVariables } from 'evlog/hono'
import type { Context } from 'hono'
import type { Child } from 'hono/jsx'

export type AppEnv = EvlogVariables // { Variables: { log: AuditableLogger } }
export type AppContext = Context<AppEnv>
export type JSXNode = Child
export type AppHandler = (c: AppContext) => Promise<Response | JSXNode> | Response | JSXNode
