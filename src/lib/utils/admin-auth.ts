import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AppContext } from './types'

const COOKIE_NAME = 'ac_admin_session'
const SECRET_KEY = process.env.ADMIN_SESSION_SECRET || 'ac-admin-secret-seed-key-2026'

/**
 * Returns true if the request contains a valid admin session cookie
 */
export function isAuthenticated(c: AppContext): boolean {
  const cookieHeader = c.req.header('Cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([k, v]) => Boolean(k && v)),
  )

  const token = cookies[COOKIE_NAME]
  if (!token) return false

  const [value, signature] = token.split('.')
  if (!value || !signature) return false

  const expectedSignature = createHmac('sha256', SECRET_KEY).update(value).digest('hex')

  if (signature.length !== expectedSignature.length) return false
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}

/**
 * Creates a signed session token
 */
export function createSessionToken(): string {
  const value = `admin_${Date.now()}`
  const signature = createHmac('sha256', SECRET_KEY).update(value).digest('hex')
  return `${value}.${signature}`
}

/**
 * Creates the Set-Cookie header string for admin login
 */
export function getLoginCookieHeader(): string {
  const token = createSessionToken()
  const maxAge = 60 * 60 * 24 * 7 // 7 days
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
}

/**
 * Creates the Set-Cookie header string for logout
 */
export function getLogoutCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
}

/**
 * Checks if the submitted password matches the configured admin password
 */
export function verifyPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || 'admin'
  if (password.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected))
}
