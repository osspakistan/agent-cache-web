import dns from 'node:dns/promises'

export interface ParkingCheckResult {
  isParked: boolean
  isGone?: boolean
  brokerName?: string
  message?: string
}

const PARKING_BROKER_DOMAINS = [
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
]

/**
 * Fast DNS + HTTP check to determine if a domain is parked, for sale, expired, or non-existent.
 */
export async function detectParkedDomain(rawUrl: string): Promise<ParkingCheckResult> {
  try {
    const parsed = new URL(rawUrl)
    const host = parsed.hostname.toLowerCase()

    // 1. DNS Resolution check
    if (host !== 'localhost' && host !== '127.0.0.1') {
      try {
        await dns.lookup(host)
      } catch (dnsErr: unknown) {
        const code = (dnsErr as { code?: string }).code
        if (code === 'ENOTFOUND' || code === 'NODATA') {
          return {
            isParked: true,
            isGone: true,
            message: `"${host}" doesn't exist on this planet. Did your cat walk across the keyboard?`,
          }
        }
      }
    }

    // 2. HTTP Probe: first probe with redirect manual to catch 301/302 parking redirects directly
    let candidateUrl = rawUrl
    let serverHeader = ''
    let locationHeader = ''

    try {
      const initialRes = await fetch(rawUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(3500),
        redirect: 'manual',
      })

      serverHeader = (initialRes.headers.get('server') || '').toLowerCase()
      locationHeader = initialRes.headers.get('location') || ''

      if (serverHeader.includes('parking')) {
        return {
          isParked: true,
          brokerName: 'domain',
          message: `"${host}" is just sitting on a domain parking lot. Give me actual docs, not parking landers.`,
        }
      }

      if (locationHeader) {
        try {
          const locParsed = new URL(locationHeader, rawUrl)
          const locHost = locParsed.hostname.toLowerCase()
          for (const broker of PARKING_BROKER_DOMAINS) {
            if (locHost === broker || locHost.endsWith(`.${broker}`)) {
              const brand = broker.split('.')[0]
              const name = brand.charAt(0).toUpperCase() + brand.slice(1)
              return {
                isParked: true,
                brokerName: name,
                message: `"${host}" is just sitting on a ${name} parking lot. Give me actual docs, not parking landers.`,
              }
            }
          }
          candidateUrl = locParsed.href
        } catch {}
      }
    } catch {}

    // 3. Full fetch following redirects to inspect HTML body and JS configs
    try {
      const res = await fetch(candidateUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(4000),
        redirect: 'follow',
      })

      if (res.status === 410) {
        return {
          isParked: true,
          isGone: true,
          message: `"${host}" is dead and gone (HTTP 410). Not even an AI can resurrect docs from the afterlife.`,
        }
      }

      const finalUrl = (res.url || candidateUrl).toLowerCase()
      const destHost = new URL(finalUrl).hostname.toLowerCase()

      // Check if redirected to an external broker
      for (const broker of PARKING_BROKER_DOMAINS) {
        if (destHost === broker || destHost.endsWith(`.${broker}`) || finalUrl.includes(broker)) {
          const brand = broker.split('.')[0]
          const name = brand.charAt(0).toUpperCase() + brand.slice(1)
          return {
            isParked: true,
            brokerName: name,
            message: `"${host}" is just sitting on a ${name} parking lot. Give me actual docs, not parking landers.`,
          }
        }
      }

      const text = await res.text()
      const lower = text.toLowerCase()

      // Check JS redirect stub (e.g. window.location.href = "/lander" or broker url)
      const jsRedirect = text.match(
        /window\.location\.(?:href|replace)\s*=\s*["']([^"']+)["']/i,
      )?.[1]
      if (jsRedirect) {
        try {
          const resolvedJs = new URL(jsRedirect, res.url).href
          const subProbe = await fetch(resolvedJs, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(2500),
            redirect: 'follow',
          })
          const subUrl = (subProbe.url || '').toLowerCase()
          const subHost = new URL(subUrl).hostname.toLowerCase()
          for (const broker of PARKING_BROKER_DOMAINS) {
            if (subHost === broker || subHost.endsWith(`.${broker}`) || subUrl.includes(broker)) {
              const brand = broker.split('.')[0]
              const name = brand.charAt(0).toUpperCase() + brand.slice(1)
              return {
                isParked: true,
                brokerName: name,
                message: `"${host}" is just sitting on a ${name} parking lot. Give me actual docs, not parking landers.`,
              }
            }
          }
          const subText = (await subProbe.text()).toLowerCase()
          if (
            subText.includes('godaddy') ||
            subText.includes('sedo') ||
            subText.includes('spaceship') ||
            subText.includes('dan.com') ||
            subText.includes('for sale')
          ) {
            return {
              isParked: true,
              message: `"${host}" is just sitting on a domain parking lot. Give me actual docs, not parking landers.`,
            }
          }
        } catch {}
      }

      // Check page title for parking / sale indicators
      const title = text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.toLowerCase() || ''
      if (
        title.includes('for sale') ||
        title.includes('buy this domain') ||
        title.includes('domain is available') ||
        title.includes('parked domain') ||
        title.includes('spaceship.com') ||
        title.includes('sedo') ||
        title.includes('dan.com') ||
        title.includes('afternic')
      ) {
        let broker = "domain squatter's for-sale"
        if (title.includes('spaceship') || lower.includes('spaceship')) broker = 'Spaceship'
        else if (title.includes('sedo') || lower.includes('sedo')) broker = 'Sedo'
        else if (title.includes('godaddy') || lower.includes('godaddy')) broker = 'GoDaddy'
        else if (title.includes('dan.com')) broker = 'Dan.com'
        return {
          isParked: true,
          brokerName: broker,
          message: `"${host}" is just sitting on a ${broker} parking lot. Give me actual docs, not parking landers.`,
        }
      }

      // Check semantic DOM/JS signatures for domain landers (Spaceship, Sedo, Dan, etc.)
      const hasParkingSignals =
        lower.includes('domain is for sale') ||
        lower.includes('buy this domain') ||
        lower.includes('parked domain') ||
        lower.includes('domain has expired') ||
        lower.includes('is available for purchase') ||
        lower.includes('inquire about this domain') ||
        lower.includes('domain marketplace') ||
        lower.includes('buyer protection program') ||
        (lower.includes('domain_config') && lower.includes('buyitnow')) ||
        (lower.includes('totalprice') && lower.includes('minofferprice')) ||
        lower.includes('forsale.spaceship-cdn.com') ||
        (lower.includes('sale-banner') && lower.includes('find the best information'))

      if (hasParkingSignals) {
        let broker = "domain squatter's for-sale"
        if (lower.includes('spaceship')) broker = 'Spaceship'
        else if (lower.includes('sedo')) broker = 'Sedo'
        else if (lower.includes('godaddy')) broker = 'GoDaddy'
        else if (lower.includes('dan.com')) broker = 'Dan.com'
        else if (lower.includes('afternic')) broker = 'Afternic'
        return {
          isParked: true,
          brokerName: broker,
          message: `"${host}" is just sitting on a ${broker} parking lot. Give me actual docs, not parking landers.`,
        }
      }
    } catch {}

    return { isParked: false }
  } catch {
    return { isParked: false }
  }
}
