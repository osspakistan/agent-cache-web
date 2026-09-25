import type { AnalyticsClientType } from './types'

export interface ClientDeviceGeo {
  clientType: AnalyticsClientType
  os: string
  browser: string
  deviceType: string
  countryCode: string
  countryName: string
  city: string
}

/**
 * Detects whether incoming request is from a Human, Coding Agent, or AI Bot
 */
export function detectClientType(userAgent: string, accept: string): AnalyticsClientType {
  const ua = (userAgent || '').toLowerCase()
  const acc = (accept || '').toLowerCase()

  // Coding agents
  if (
    ua.includes('claude') ||
    ua.includes('cursor') ||
    ua.includes('windsurf') ||
    ua.includes('codex') ||
    ua.includes('copilot') ||
    ua.includes('agent') ||
    ua.includes('antigravity') ||
    acc.includes('text/markdown')
  ) {
    return 'agent'
  }

  // Crawlers / AI bots
  if (
    ua.includes('bot') ||
    ua.includes('crawl') ||
    ua.includes('spider') ||
    ua.includes('slurp') ||
    ua.includes('gptbot') ||
    ua.includes('perplexity') ||
    ua.includes('anthropic-ai') ||
    ua.includes('bingbot') ||
    ua.includes('googlebot')
  ) {
    return 'bot'
  }

  return 'human'
}

/**
 * Parses OS and browser from User-Agent string
 */
export function parseUserAgent(userAgent: string): {
  os: string
  browser: string
  deviceType: string
} {
  const ua = userAgent || ''
  let os = 'Unknown'
  let browser = 'Unknown'
  let deviceType = 'Desktop'

  // Device
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    deviceType = /tablet|ipad/i.test(ua) ? 'Tablet' : 'Mobile'
  }

  // OS
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS'

  // Browser
  if (/edg/i.test(ua)) browser = 'Edge'
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome'
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox'
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
  else if (/curl|wget|python|httpclient/i.test(ua)) browser = 'CLI/Script'

  return { os, browser, deviceType }
}

/**
 * Extracts Geo information from common CDN / reverse proxy headers (Cloudflare, Caddy, Nginx)
 */
export function parseGeoHeaders(headers: Headers): {
  countryCode: string
  countryName: string
  city: string
} {
  const countryCode =
    headers.get('cf-ipcountry') ||
    headers.get('x-country-code') ||
    headers.get('geoip-country-code') ||
    'XX'

  const city = headers.get('cf-ipcity') || headers.get('x-city') || headers.get('geoip-city') || ''

  const countryName = countryNames[countryCode.toUpperCase()] || countryCode

  return {
    countryCode: countryCode.toUpperCase(),
    countryName,
    city,
  }
}

/**
 * Map country code to emoji flag
 */
export function countryFlag(code?: string): string {
  if (!code || code === 'XX' || code.length !== 2) return '🌐'
  const offset = 127397
  const chars = [...code.toUpperCase()].map((c) => c.charCodeAt(0) + offset)
  return String.fromCodePoint(...chars)
}

const countryNames: Record<string, string> = {
  US: 'United States',
  PK: 'Pakistan',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  CA: 'Canada',
  IN: 'India',
  NL: 'Netherlands',
  JP: 'Japan',
  AU: 'Australia',
  SG: 'Singapore',
  BR: 'Brazil',
  SE: 'Sweden',
  CH: 'Switzerland',
  ES: 'Spain',
  IT: 'Italy',
}
