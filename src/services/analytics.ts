import { RequestContext } from '../types';

// ============================================================================
// CONSTANTS & REGULAR EXPRESSIONS
// ============================================================================

/** Allowed origins for strict CORS verification */
const ALLOWED_ORIGINS = new Set([
  'https://www.codingdatafy.com',
  'https://codingdatafy.com'
]);

/** Text encoder instance for binary conversions */
const encoder = new TextEncoder();

/** Regex pattern to flag automated web crawlers, bots, and LLM scrapers */
const BOT_REGEX = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefs|semrush|gptbot|chatgpt|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|coherebot|headlesschrome|python|node-fetch|axios|bytespider|ccbot|facebookbot|meta-external|amazonbot|petalbot|scrapy|diffbot|dotbot|rogerbot|blexbot|dataforseo|mj12bot|serpstatbot|perplexity|perplexity-user|perplexitybot|applebot|yandex|bingbot|baidu/i;

/** Regex pattern to flag traffic originating from known datacenter providers */
const DATACENTER_REGEX = /amazon|aws|google cloud|digitalocean|linode|hetzner|ovh|vultr|azure|alibaba|oracle cloud|fastly|leaseweb|choopa|scaleway|cloudocean|contabo|kamatera|hostinger|hostgator|bluehost/i;

// ============================================================================
// UTILITIES & TOKEN GENERATORS
// ============================================================================

function bufferToHex(buffer: ArrayBuffer | Uint8Array, length = 64): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  const len = Math.min(bytes.length, Math.ceil(length / 2));
  for (let i = 0; i < len; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex.substring(0, length);
}

function getSyncToken(path: string, timestamp: number): string {
  const str = `${path}-${timestamp}-CodingDatafyToken`;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hashVal = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hashVal.toString(16).padStart(24, '0').substring(0, 24);
}

function jsonResponse(data: Record<string, unknown>, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// WORKER ANALYTICS SERVICES & DISPATCHERS
// ============================================================================

/**
 * Tracks HTTP response latency and execution metrics directly from `index.ts`
 */
export async function trackEvent(
  context: RequestContext,
  statusCode: number,
  durationMs: number
): Promise<void> {
  const { env, pathname, request } = context;

  if (!env.SITE_ANALYTICS) return;

  try {
    const userAgent = request.headers.get('user-agent') || '';
    if (BOT_REGEX.test(userAgent)) return;

    env.SITE_ANALYTICS.writeDataPoint({
      indexes: ['worker_fetch'],
      blobs: [
        pathname,
        request.headers.get('cf-ipcountry') || 'UNKNOWN',
        request.headers.get('cf-connecting-ip') || '127.0.0.1'
      ],
      doubles: [
        statusCode,
        durationMs,
        Date.now()
      ]
    });
  } catch (err: unknown) {
    console.error('[Analytics Engine Error] Engine fetch dispatch failed:', err);
  }
}

/**
 * Endpoint Handler for Client-Side Beacons (`/lib`)
 * Evaluates bot security rules, client-hints, cryptographic tokens, and emits data points to Analytics Engine.
 */
export async function handleAnalyticsRoute(context: RequestContext): Promise<Response> {
  const { request, env } = context;

  // CORS Verification
  const origin = request.headers.get('Origin') || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.has(origin);
  const allowOriginHeader = isAllowedOrigin ? origin : 'https://www.codingdatafy.com';

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOriginHeader,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Application/Json',
    'Access-Control-Max-Age': '86400',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // Sec-Fetch Metadata Checks
  const fetchDest = request.headers.get('sec-fetch-dest');
  const fetchMode = request.headers.get('sec-fetch-mode');

  if ((fetchDest && fetchDest !== 'empty' && fetchDest !== 'document') ||
      (fetchMode && fetchMode !== 'cors' && fetchMode !== 'navigate' && fetchMode !== 'no-cors')) {
    return jsonResponse({ status: 'ignored_direct_api_call' }, 200, corsHeaders);
  }

  try {
    let body: Record<string, any> = {};
    const textPayload = await request.text();

    if (textPayload) {
      try {
        body = JSON.parse(textPayload);
      } catch {
        const params = new URLSearchParams(textPayload);
        body = {
          p: params.get('p'),
          r: params.get('r'),
          type: params.get('type') || 'init',
          event_type: params.get('event_type') || null,
          target: params.get('target') || null,
          is_404: params.get('is_404') === 'true',
          ts: params.get('ts') ? Number(params.get('ts')) : 0,
          token: params.get('token') || ''
        };
      }
    }

    // Path Sanitization
    const rawPath = typeof body.p === 'string' ? body.p : '/';
    const cleanPath = rawPath.split('?')[0]?.replace(/\/+$/, '') || '/';
    const targetPath = cleanPath.substring(0, 500);

    // Cryptographic Token Validation
    const clientTs = Number(body.ts) || 0;
    const clientToken = body.token || '';
    const now = Date.now();

    if (!clientToken || Math.abs(now - clientTs) > 60000) {
      return jsonResponse({ status: 'invalid_token_or_expired' }, 200, corsHeaders);
    }

    const expectedData = `${targetPath}-${clientTs}-CodingDatafyToken`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(expectedData));
    const expectedTokenAsync = bufferToHex(hashBuffer, 24);
    const expectedTokenSync = getSyncToken(targetPath, clientTs);

    if (clientToken !== expectedTokenAsync && clientToken !== expectedTokenSync) {
      return jsonResponse({ status: 'unauthorized_signature' }, 200, corsHeaders);
    }

    // Bot & Client Spoof Guards
    const clientIP = request.headers.get('cf-connecting-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';
    const country = request.headers.get('cf-ipcountry') || 'UNKNOWN';

    if (!userAgent || userAgent.trim() === '') {
      return jsonResponse({ status: 'ignored_no_ua' }, 200, corsHeaders);
    }

    if (BOT_REGEX.test(userAgent)) {
      return jsonResponse({ status: 'ignored_bot' }, 200, corsHeaders);
    }

    // Client Hints Verification
    const secChUa = request.headers.get('sec-ch-ua');
    const secChPlatform = request.headers.get('sec-ch-ua-platform');

    if (/Chrome\/(1[0-9]{2})/i.test(userAgent) && !secChUa) {
      return jsonResponse({ status: 'ignored_missing_client_hints' }, 200, corsHeaders);
    }

    if (secChPlatform) {
      const platformVal = secChPlatform.replace(/"/g, '').trim();
      const isMacUA = /Macintosh|Mac OS X/i.test(userAgent);
      if (isMacUA && platformVal !== 'macOS') {
        return jsonResponse({ status: 'ignored_spoofed_platform' }, 200, corsHeaders);
      }
    }

    // Datacenter Verification
    const asOrg = typeof request.cf?.asOrganization === 'string' ? request.cf.asOrganization.toLowerCase() : '';
    const isOperaProxy = /opera software/i.test(asOrg) || /opera mini|opr\//i.test(userAgent);

    if (DATACENTER_REGEX.test(asOrg) && !isOperaProxy) {
      return jsonResponse({ status: 'ignored_datacenter_traffic' }, 200, corsHeaders);
    }

    // Privacy-Preserving Hash Calculation
    const currentDay = new Date().toISOString().slice(0, 10);
    const rawSecret = `${clientIP}-${userAgent}-${currentDay}-CD-Secret`;
    const visitorHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawSecret));
    const visitorHash = bufferToHex(visitorHashBuffer, 16);

    const requestType = body.type || 'init';

    // ROUTE A: Custom Interaction Events
    if (requestType === 'event') {
      const eventType = body.event_type;
      const targetValue = typeof body.target === 'string' ? body.target.substring(0, 500) : '';

      if (['copy_code', 'outbound_click', 'site_search'].includes(eventType)) {
        env.SITE_ANALYTICS.writeDataPoint({
          indexes: [eventType],
          blobs: [
            targetPath,
            targetValue,
            visitorHash,
            country
          ],
          doubles: [
            clientTs
          ]
        });
      }

      return jsonResponse({ status: 'event_recorded' }, 200, corsHeaders);
    }

    // ROUTE B: Initial Pageview Logging
    const { deviceType, browserName, browserVersion, osName, osVersion } = parseClientInfo(userAgent, request);

    let parsedReferrer = 'direct';
    if (body.r) {
      try {
        const refHost = new URL(body.r).hostname.replace(/^www\./, '');
        parsedReferrer = refHost === 'codingdatafy.com' ? 'internal' : (refHost || 'direct');
      } catch {
        parsedReferrer = 'direct';
      }
    }

    const is404Flag = (body.is_404 === true || body.is_404 === 'true') ? 1 : 0;

    // Dispatch Data Point to Cloudflare Analytics Engine
    env.SITE_ANALYTICS.writeDataPoint({
      indexes: ['pageview'],
      blobs: [
        targetPath,              // blob1
        parsedReferrer,          // blob2
        country,                 // blob3
        deviceType,              // blob4
        browserName,             // blob5
        browserVersion || '',    // blob6
        osName,                  // blob7
        osVersion || '',         // blob8
        visitorHash              // blob9
      ],
      doubles: [
        is404Flag,               // double1
        clientTs                 // double2
      ]
    });

    return jsonResponse({ status: 'recorded' }, 200, corsHeaders);

  } catch (err: any) {
    return jsonResponse({ status: 'error', message: err?.message || 'Server error' }, 500, corsHeaders);
  }
}

// ============================================================================
// CLIENT DEVICE & BROWSER PARSER
// ============================================================================

function parseClientInfo(ua: string, request: Request) {
  let deviceType = 'desktop';
  const cfDeviceType = request.headers.get('cf-device-type')?.toLowerCase().trim();

  if (cfDeviceType && ['desktop', 'mobile', 'tablet'].includes(cfDeviceType)) {
    deviceType = cfDeviceType;
  } else if (cfDeviceType) {
    deviceType = 'other';
  } else {
    const isMobileHeader = request.headers.get('sec-ch-ua-mobile') === '?1';
    const isIPadDesktopMode = /Macintosh/i.test(ua) && request.headers.get('sec-ch-ua-mobile') === '?0' && /touch/i.test(ua);
    const isTablet = /ipad|tablet|(android(?!.*mobile))/i.test(ua) || isIPadDesktopMode;
    const isMobile = /mobile|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(ua) || isMobileHeader;
    const isOtherDevice = /tv|smarttv|googletv|appletv|hbbtv|playstation|xbox|nintendo|roku/i.test(ua);

    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';
    else if (isOtherDevice) deviceType = 'other';
  }

  let osName = 'Other';
  let osVersion: string | null = null;

  const chPlatform = request.headers.get('sec-ch-ua-platform')?.replace(/"/g, '').trim();
  const chPlatformVersion = request.headers.get('sec-ch-ua-platform-version')?.replace(/"/g, '').trim();

  if (chPlatform) {
    if (chPlatform === 'Windows') {
      osName = 'Windows';
      const majorVer = chPlatformVersion ? parseInt(chPlatformVersion.split('.')[0] || '0', 10) : 0;
      if (majorVer >= 13) osVersion = '11';
      else if (majorVer > 0) osVersion = '10';
    } else if (chPlatform === 'Android') {
      osName = 'Android';
      if (chPlatformVersion) {
        const cleanVer = chPlatformVersion.replace(/[^0-9.]/g, '').split('.')[0];
        if (cleanVer && cleanVer !== '0') osVersion = cleanVer;
      }
    } else if (chPlatform === 'Chrome OS') {
      osName = 'ChromeOS';
    }
  }

  if (osName === 'Other' || !osVersion) {
    if (/Android\s([0-9\.]+)/i.test(ua)) {
      osName = 'Android';
      osVersion = RegExp.$1.split('.')[0] || null;
    } else if (/Windows NT 10\.0/i.test(ua)) {
      osName = 'Windows';
      if (!osVersion) osVersion = '10/11';
    } else if (/Windows NT 6\.3/i.test(ua)) { osName = 'Windows'; osVersion = '8.1'; }
    else if (/Windows NT 6\.2/i.test(ua)) { osName = 'Windows'; osVersion = '8'; }
    else if (/Windows NT 6\.1/i.test(ua)) { osName = 'Windows'; osVersion = '7'; }
    else if (/Windows NT/i.test(ua)) { osName = 'Windows'; }
    else if (/iPhone|iPod/i.test(ua) || (chPlatform === 'iOS' && !/iPad/i.test(ua))) {
      osName = 'iOS';
      if (/OS\s([0-9_]+)\slike\sMac\sOS\sX/i.test(ua)) osVersion = RegExp.$1.replace(/_/g, '.').split('.')[0] || null;
    } else if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && request.headers.get('sec-ch-ua-mobile') === '?0' && /touch/i.test(ua))) {
      osName = 'iPadOS';
      if (/OS\s([0-9_]+)\slike\sMac\sOS\sX/i.test(ua)) osVersion = RegExp.$1.replace(/_/g, '.').split('.')[0] || null;
      else if (/Version\/([0-9\.]+)/i.test(ua)) osVersion = RegExp.$1.split('.')[0] || null;
    } else if (/Mac OS X|Macintosh/i.test(ua) || chPlatform === 'macOS') {
      osName = 'macOS';
      if (/Mac OS X\s([0-9_\.]+)/i.test(ua)) {
        const parts = RegExp.$1.replace(/_/g, '.').split('.');
        osVersion = `${parts[0]}.${parts[1] || '0'}`;
      }
    } else if (/Ubuntu[\/\s]([0-9\.]+)/i.test(ua)) { osName = 'Ubuntu'; osVersion = RegExp.$1.split('.')[0] || null; }
    else if (/Fedora[\/\s]([0-9\.]+)/i.test(ua)) { osName = 'Fedora'; osVersion = RegExp.$1.split('.')[0] || null; }
    else if (/Debian[\/\s]([0-9\.]+)/i.test(ua)) { osName = 'Debian'; osVersion = RegExp.$1.split('.')[0] || null; }
    else if (/Mint[\/\s]([0-9\.]+)/i.test(ua)) { osName = 'Linux Mint'; osVersion = RegExp.$1.split('.')[0] || null; }
    else if (/Arch/i.test(ua)) osName = 'Arch Linux';
    else if (/CrOS/i.test(ua)) osName = 'ChromeOS';
    else if (/Linux/i.test(ua)) osName = 'Linux';
    else if (/FreeBSD/i.test(ua)) osName = 'FreeBSD';
    else if (/OpenBSD/i.test(ua)) osName = 'OpenBSD';
    else if (/SunOS/i.test(ua)) osName = 'Solaris';
    else if (/HarmonyOS/i.test(ua)) osName = 'HarmonyOS';
  }

  let browserName = 'Other';
  let browserVersion: string | null = null;

  if (/Arc\/(\d+)/i.test(ua)) {
    browserName = 'Arc';
    browserVersion = RegExp.$1;
  } else if (/Brave/i.test(ua) || request.headers.get('sec-ch-ua')?.includes('Brave')) {
    browserName = 'Brave';
    const chromeMatch = ua.match(/Chrome\/(\d+)/i);
    if (chromeMatch) browserVersion = chromeMatch[1] || null;
  } else if (/Vivaldi\/(\d+)/i.test(ua)) {
    browserName = 'Vivaldi';
    browserVersion = RegExp.$1;
  } else if (/Opera GX\/(\d+)/i.test(ua)) {
    browserName = 'Opera GX';
    browserVersion = RegExp.$1;
  } else if (/OPR\/(\d+)|Opera Mini\/(\d+)|Opera/i.test(ua)) {
    browserName = 'Opera';
    browserVersion = (RegExp.$1 || RegExp.$2 || null)?.trim() || null;
  } else if (/EdgA?\/(\d+)|EdgiOS\/(\d+)/i.test(ua)) {
    browserName = 'Edge';
    browserVersion = (RegExp.$1 || RegExp.$2 || null)?.trim() || null;
  } else if (/YaBrowser\/(\d+)/i.test(ua)) {
    browserName = 'Yandex';
    browserVersion = RegExp.$1;
  } else if (/SamsungBrowser\/(\d+)/i.test(ua)) {
    browserName = 'Samsung Internet';
    browserVersion = RegExp.$1;
  } else if (/UCBrowser\/(\d+)/i.test(ua)) {
    browserName = 'UC Browser';
    browserVersion = RegExp.$1;
  } else if (/DuckDuckGo\/(\d+)/i.test(ua)) {
    browserName = 'DuckDuckGo';
    browserVersion = RegExp.$1;
  } else if (/TorBrowser|Tor\//i.test(ua)) {
    browserName = 'Tor Browser';
  } else if (/GSA\/(\d+)/i.test(ua)) {
    browserName = 'Google App';
    browserVersion = RegExp.$1;
  } else if (/CriOS\/(\d+)/i.test(ua)) {
    browserName = 'Chrome iOS';
    browserVersion = RegExp.$1;
  } else if (/FxiOS\/(\d+)/i.test(ua)) {
    browserName = 'Firefox iOS';
    browserVersion = RegExp.$1;
  } else if (/MSIE\s(\d+)|Trident\/.*rv:(\d+)/i.test(ua)) {
    browserName = 'IE';
    browserVersion = (RegExp.$1 || RegExp.$2 || null)?.trim() || null;
  } else if (/Firefox\/(\d+)/i.test(ua)) {
    browserName = 'Firefox';
    browserVersion = RegExp.$1;
  } else if (/Chrome\/(\d+)/i.test(ua)) {
    browserName = 'Chrome';
    browserVersion = RegExp.$1;
  } else if (/Version\/(\d+).*Safari/i.test(ua)) {
    browserName = 'Safari';
    browserVersion = RegExp.$1;
  }

  return { deviceType, browserName, browserVersion, osName, osVersion };
}