import type { Rule } from './types'

export const URL_RULES: Rule[] = [
  {
    name: 'dns_registered',
    description: 'Domain must resolve via DNS (be registered)',
    severity: 'error',
    category: 'registration',
    check: 'dns_lookup',
    on_fail: {
      code: 'DOMAIN_NOT_REGISTERED',
      message: '"{host}" doesn\'t exist on this planet. Did your cat walk across the keyboard?',
    },
  },
  {
    name: 'http_reachable',
    description: 'Domain must respond to HTTP requests',
    severity: 'error',
    category: 'connectivity',
    check: 'http_ping',
    timeout_ms: 5000,
    on_fail: {
      code: 'DOMAIN_UNREACHABLE',
      message:
        '"{host}" is unreachable. Check the spelling or see if the site is offline right now.',
    },
  },
  {
    name: 'not_parked_broker_redirect',
    description: 'Domain must not redirect to a known parking broker',
    severity: 'error',
    category: 'parking',
    check: 'parking_broker_redirect',
    broker_domains: [
      'sedo.com',
      'godaddy.com',
      'dan.com',
      'afternic.com',
      'spaceship.com',
      'squadhelp.com',
      'bodis.com',
      'parkingcrew.net',
      'hugedomains.com',
      'atom.com',
      'namecheap.com',
      'domainmarket.com',
      'buydomains.com',
      'undeveloped.com',
    ],
    on_fail: {
      code: 'PARKED_DOMAIN',
      message:
        '"{host}" is just sitting on a {broker} parking lot. Give me actual docs, not parking landers.',
    },
  },
  {
    name: 'not_parked_server_header',
    description: 'Server header must not indicate parking',
    severity: 'error',
    category: 'parking',
    check: 'parking_server_header',
    on_fail: {
      code: 'PARKED_DOMAIN',
      message:
        '"{host}" is just sitting on a domain parking lot. Give me actual docs, not parking landers.',
    },
  },
  {
    name: 'not_parked_html_signals',
    description: 'HTML content must not contain parking/for-sale signals',
    severity: 'error',
    category: 'parking',
    check: 'parking_html_signals',
    signals: [
      'domain is for sale',
      'buy this domain',
      'parked domain',
      'domain has expired',
      'is available for purchase',
      'inquire about this domain',
      'domain marketplace',
      'buyer protection program',
    ],
    title_signals: [
      'for sale',
      'buy this domain',
      'domain is available',
      'parked domain',
      'spaceship.com',
      'sedo',
      'dan.com',
      'afternic',
    ],
    on_fail: {
      code: 'PARKED_DOMAIN',
      message:
        '"{host}" is just sitting on a {broker} parking lot. Give me actual docs, not parking landers.',
    },
  },
  {
    name: 'not_gone_410',
    description: 'Domain must not return HTTP 410 Gone',
    severity: 'error',
    category: 'connectivity',
    check: 'http_status_410',
    on_fail: {
      code: 'DOMAIN_GONE',
      message:
        '"{host}" is dead and gone (HTTP 410). Not even an AI can resurrect docs from the afterlife.',
    },
  },
  {
    name: 'has_live_content',
    description: 'Domain must serve actual HTML content (not empty/error page)',
    severity: 'error',
    category: 'content',
    check: 'live_content',
    min_content_length: 200,
    on_fail: {
      code: 'NO_LIVE_WEBSITE',
      message:
        '"{host}" doesn\'t appear to have a live website. The page is empty or returns an error.',
    },
  },
  {
    name: 'not_bot_blocked',
    description: 'Domain must not return 403/429 (bot challenge)',
    severity: 'warning',
    category: 'connectivity',
    check: 'bot_blocked',
    on_fail: {
      code: 'BOT_BLOCKED',
      message: '"{host}" is blocking automated access. I\'ll try alternative methods.',
    },
  },
]
