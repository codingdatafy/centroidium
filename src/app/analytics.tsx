/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

'use client';

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// ============================================================================
// BLOCK 1: CONSTANTS & UTILITIES
// ============================================================================

/** Endpoint routing for metrics dispatch */
const METRICS_ENDPOINT = '/lib';

/** Reusable text encoder instance for string hashing */
const encoder = new TextEncoder();

/**
 * Converts an ArrayBuffer or Uint8Array to a hex string of specified length.
 */
const bufferToHex = (buffer: ArrayBuffer | Uint8Array, length = 24): string => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  const len = Math.min(bytes.length, Math.ceil(length / 2));
  for (let i = 0; i < len; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex.substring(0, length);
};

// ============================================================================
// BLOCK 2: CRYPTOGRAPHIC TOKEN GENERATORS (HMAC SIGNATURES)
// ============================================================================

/**
 * Generates an asynchronous SHA-256 client token using Web Crypto API.
 */
const generateClientToken = async (path: string, timestamp: number): Promise<string> => {
  const data = `${path}-${timestamp}-CodingDatafyToken`;
  const msgBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return bufferToHex(hashBuffer, 24);
};

/**
 * Generates a synchronous fallback hash token using Murmur-like bitwise shifts.
 * Used primarily during page unload / beacon flush events.
 */
const generateClientTokenSync = (path: string, timestamp: number): string => {
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
};

// ============================================================================
// BLOCK 3: EVENT TRACKING EXPORT & GLOBAL BINDING
// ============================================================================

/**
 * Programmatically tracks user interactions (e.g. code copy, outbound links).
 */
export const trackEvent = async (
  eventType: 'copy_code' | 'outbound_click',
  targetValue?: string
) => {
  if (typeof window === 'undefined') return;

  const pathname = window.location.pathname;
  const cleanPath = (pathname.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  
  const timestamp = Date.now();
  const clientToken = await generateClientToken(cleanPath, timestamp);

  const payload = JSON.stringify({
    type: 'event',
    event_type: eventType,
    p: cleanPath,
    target: targetValue || null,
    ts: timestamp,
    token: clientToken
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(METRICS_ENDPOINT, blob);
  } else {
    fetch(METRICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
};

/** Expose tracking globally for non-React contexts */
if (typeof window !== 'undefined') {
  (window as any).trackEvent = trackEvent;
}

// ============================================================================
// BLOCK 4: MAIN REACT ANALYTICS COMPONENT
// ============================================================================

export default function Analytics() {
  const rawPathname = usePathname();

  // State Persistence Refs across Route Changes
  const lastTrackedPath = useRef<string | null>(null);
  const pageviewId = useRef<number | null>(null);
  const pendingPingPayload = useRef<{ durationSec: number; isBounce: boolean } | null>(null);

  // Time & Active Duration Metrics Refs
  const accumulatedMs = useRef<number>(0);
  const lastActiveTimestamp = useRef<number>(0);
  const lastDispatchedDuration = useRef<number>(-1);

  useEffect(() => {
    // ------------------------------------------------------------------------
    // STEP 4.1: ENVIRONMENT & INITIALIZATION VALIDATION
    // ------------------------------------------------------------------------
    if (typeof window === 'undefined') return;

    const cleanPathname = (rawPathname?.split('?')[0] || '/').replace(/\/+$/, '') || '/';

    // Prevent duplicate triggers on identical route evaluations
    if (lastTrackedPath.current === cleanPathname) return;

    // Restore cached pageview session ID
    const sessionKeyId = `cd_pv_id_${cleanPathname}`;
    const cachedId = sessionStorage.getItem(sessionKeyId);
    pageviewId.current = cachedId ? parseInt(cachedId, 10) : null;
    pendingPingPayload.current = null;
    lastDispatchedDuration.current = -1;

    // Handle internal admin bypass query parameter (?admin=true)
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('admin') === 'true') {
      localStorage.setItem('analytics-disable', 'true');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl); 
      alert('CodingDatafy: Analytics tracking is now disabled for this browser.');
    }

    // ------------------------------------------------------------------------
    // STEP 4.2: SECURITY & MULTI-LAYER BOT DETECTION
    // ------------------------------------------------------------------------
    const hostname = window.location.hostname;
    const isOfficialDomain = hostname === 'www.codingdatafy.com' || hostname === 'codingdatafy.com';

    const ua = navigator.userAgent.toLowerCase();
    
    // Check 1: User-Agent RegEx Pattern Matching
    const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefs|semrush|gptbot|chatgpt|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|coherebot|headlesschrome|python|node-fetch|axios|bytespider|ccbot|facebookbot|meta-external|amazonbot|petalbot|scrapy|diffbot|dotbot|rogerbot|blexbot|dataforseo|mj12bot|serpstatbot|perplexity|perplexity-user|perplexitybot|applebot|yandex|bingbot|baidu/i.test(ua);

    // Check 2: Headless & Automation Signals
    const isWebDriver = navigator.webdriver === true;
    const isPhantom = 'callPhantom' in window || '_phantom' in window;
    const isHeadlessWindow = 'Buffer' in window || 'emit' in window;
    const hasNoLanguages = !navigator.languages || navigator.languages.length === 0;
    const isHeadlessChrome = /headlesschrome/i.test(ua);
    const isAutomatedBot = isWebDriver || isPhantom || isHeadlessWindow || hasNoLanguages || isHeadlessChrome;

    const isExplicitlyDisabled = localStorage.getItem('analytics-disable') === 'true';

    // Check 3: Advanced Browser Fingerprint Verification
    const isAdvancedBotGuard = (): boolean => {
      try {
        const isScreenMismatch = 
          window.outerWidth > 0 && 
          window.outerHeight > 0 && 
          (window.outerWidth > window.screen.width + 100 || window.outerHeight > window.screen.height + 100);
        
        const navConn = (navigator as any).connection;
        const hasZeroRttConnection = navConn && navConn.rtt === 0 && navConn.downlink === 0;

        const isMacChromeBot = /Macintosh/i.test(ua) && 
          window.devicePixelRatio === 1 && 
          screen.colorDepth < 24;

        const isPermissionsSpoofed = 'permissions' in navigator && 
          navigator.permissions.query.toString().includes('native code') === false;

        return isScreenMismatch || hasZeroRttConnection || isMacChromeBot || isPermissionsSpoofed;
      } catch {
        return false;
      }
    };

    // Check 4: Datacenter & Software Rendering Detection via WebGL / Canvas
    const isDatacenterBot = () => {
      if (document.visibilityState === 'hidden') return false;

      const hasZeroDimensions = window.outerWidth === 0 && window.outerHeight === 0;
      const hasInvalidScreen = screen.width === 0 || screen.height === 0;
      const hasNoHardwareConcurrency = !navigator.hardwareConcurrency || navigator.hardwareConcurrency < 1;

      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return hasZeroDimensions || hasInvalidScreen || hasNoHardwareConcurrency;

        let isSoftware = false;

        const standardRenderer = (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).RENDERER) || '';
        if (typeof standardRenderer === 'string') {
          const rendererLower = standardRenderer.toLowerCase();
          isSoftware = rendererLower.includes('swiftshader') || rendererLower.includes('llvmpipe') || rendererLower.includes('mesa');
        }

        canvas.width = 16;
        canvas.height = 16;
        const ctx2d = canvas.getContext('2d');
        if (ctx2d) {
          ctx2d.textBaseline = "top";
          ctx2d.font = "14px 'Arial'";
          ctx2d.fillStyle = "#f60";
          ctx2d.fillRect(2, 2, 6, 6);
          ctx2d.fillStyle = "#069";
          ctx2d.fillText("CD", 1, 1);
        }
        const isBadCanvas = canvas.toDataURL().length < 30;

        return hasZeroDimensions || hasInvalidScreen || hasNoHardwareConcurrency || isSoftware || isBadCanvas;
      } catch {
        return false;
      }
    };

    // Evaluate global visitor legitimacy
    const isValidVisitor = isOfficialDomain && !isBotAgent && !isAutomatedBot && !isExplicitlyDisabled && !isDatacenterBot() && !isAdvancedBotGuard();

    if (!isValidVisitor) return;

    // ------------------------------------------------------------------------
    // STEP 4.3: METRICS SETUP & PAGE STATE PARSING
    // ------------------------------------------------------------------------
    const activePath = cleanPathname;

    /** Determines if the current page is a 404 error page */
    const checkIs404Page = (): boolean => {
      const has404Meta = !!document.querySelector('meta[name="next-error"]');
      const isNotFoundTitle = document.title.toLowerCase().includes('404') || document.title.toLowerCase().includes('not found');
      const has404Element = !!document.querySelector('[data-is-404="true"]');

      return has404Meta || isNotFoundTitle || has404Element;
    };

    const is404Detected = checkIs404Page();

    // Determine internal vs external referrer
    let referrer = document.referrer || '';
    const sessionKey = 'cd_has_navigated';
    
    if (sessionStorage.getItem(sessionKey)) {
      referrer = window.location.origin;
    } else {
      sessionStorage.setItem(sessionKey, 'true');
    }

    // Timer and State Flags Initialization
    accumulatedMs.current = 0;
    lastActiveTimestamp.current = 0;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const IDLE_TIMEOUT_MS = 60000;

    let hasInteracted = false;
    let isInitialized = false;

    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);

    // ------------------------------------------------------------------------
    // STEP 4.4: DURATION CALCULATOR & IDLE TIMERS
    // ------------------------------------------------------------------------
    const startTimer = () => {
      if (document.visibilityState === 'visible' && lastActiveTimestamp.current === 0) {
        lastActiveTimestamp.current = Date.now();
      }
    };

    const pauseTimer = () => {
      if (lastActiveTimestamp.current > 0) {
        accumulatedMs.current += Date.now() - lastActiveTimestamp.current;
        lastActiveTimestamp.current = 0;
      }
    };

    const getActiveDurationSeconds = (): number => {
      let total = accumulatedMs.current;
      if (document.visibilityState === 'visible' && lastActiveTimestamp.current > 0) {
        total += Date.now() - lastActiveTimestamp.current;
      }
      return Math.max(0, Math.round(total / 1000));
    };

    const resetIdleTimer = () => {
      if (document.visibilityState !== 'visible') return;

      if (lastActiveTimestamp.current === 0) {
        lastActiveTimestamp.current = Date.now();
      }

      if (idleTimer) clearTimeout(idleTimer);

      idleTimer = setTimeout(() => {
        pauseTimer();
      }, IDLE_TIMEOUT_MS);
    };

    // ------------------------------------------------------------------------
    // STEP 4.5: METRICS DISPATCH METHODOLOGY
    // ------------------------------------------------------------------------
    
    /** Flushes duration ping payload synchronously via Beacon API or fallback Fetch */
    const dispatchPingSync = (id: number | null, durationSec: number, isBounce: boolean) => {
      if (durationSec === lastDispatchedDuration.current) return;
      lastDispatchedDuration.current = durationSec;

      const timestamp = Date.now();
      const clientToken = generateClientTokenSync(activePath, timestamp);

      const params = new URLSearchParams();
      params.append('p', activePath);
      params.append('r', referrer);
      params.append('d', durationSec.toString());
      params.append('b', isBounce ? 'true' : 'false');
      params.append('is_404', is404Detected ? 'true' : 'false');
      params.append('type', 'ping');
      if (id) params.append('id', id.toString());
      params.append('ts', timestamp.toString());
      params.append('token', clientToken);

      const blobPayload = new Blob([params.toString()], {
        type: 'application/x-www-form-urlencoded'
      });

      let sent = false;
      if (navigator.sendBeacon) {
        sent = navigator.sendBeacon(METRICS_ENDPOINT, blobPayload);
      }

      if (!sent) {
        fetch(METRICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          keepalive: true,
        }).catch(() => {});
      }
    };

    /** Handles initial pageview logging (init) or update updates (ping) */
    const sendPayload = async (isUpdate = false) => {
      if (isUpdate) {
        pauseTimer();

        const durationSec = getActiveDurationSeconds();
        const isBounce = !hasInteracted && durationSec < 10;
        const currentId = pageviewId.current;

        dispatchPingSync(currentId, durationSec, isBounce);
        return;
      }

      const timestamp = Date.now();
      const clientToken = await generateClientToken(activePath, timestamp);

      const payload = JSON.stringify({
        p: activePath,
        r: referrer,
        d: 0,
        b: true,
        is_404: is404Detected,
        type: 'init',
        id: null,
        ts: timestamp,
        token: clientToken
      });

      try {
        const res = await fetch(METRICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.id) {
            pageviewId.current = data.id;
            sessionStorage.setItem(sessionKeyId, data.id.toString());
            
            if (pendingPingPayload.current) {
              const { durationSec: pDuration, isBounce: pBounce } = pendingPingPayload.current;
              pendingPingPayload.current = null;
              dispatchPingSync(data.id, pDuration, pBounce);
            }
          }
        }
      } catch {}
    };

    // ------------------------------------------------------------------------
    // STEP 4.6: EVENT HANDLERS & BROWSER LISTENERS
    // ------------------------------------------------------------------------
    const handleInteraction = () => {
      hasInteracted = true;
      resetIdleTimer();
    };

    const handleOutboundClick = (event: MouseEvent) => {
      const targetAnchor = (event.target as HTMLElement).closest('a');
      if (!targetAnchor) return;

      const href = targetAnchor.getAttribute('href');
      if (!href) return;

      const isExternal = href.startsWith('http') && 
                         !href.includes('codingdatafy.com') && 
                         !href.includes(window.location.hostname);

      if (isExternal) {
        trackEvent('outbound_click', href);
      }
    };

    const handlePopState = () => {
      lastTrackedPath.current = null;
      isInitialized = false;
      startTrackingIfVisible();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        lastTrackedPath.current = null;
        isInitialized = false;
        startTrackingIfVisible();
      }
    };

    /** Initializes listeners and sends the initial tracking payload */
    const startTrackingIfVisible = () => {
      if (isInitialized) return;
      
      isInitialized = true;
      lastTrackedPath.current = cleanPathname;
      startTimer();
      resetIdleTimer();

      sendPayload(false);

      const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
      activityEvents.forEach((evt) => {
        window.addEventListener(evt, handleInteraction, { passive: true });
      });

      window.addEventListener('click', handleOutboundClick, { capture: true, passive: true });
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('pageshow', handlePageShow);
    };

    // Start execution if current tab is active
    if (document.visibilityState === 'visible') {
      startTrackingIfVisible();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!isInitialized) {
          startTrackingIfVisible();
        } else {
          startTimer();
          resetIdleTimer();
        }
      } else if (document.visibilityState === 'hidden') {
        if (isInitialized) {
          if (idleTimer) clearTimeout(idleTimer);
          sendPayload(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handlePageHide = () => {
      if (isInitialized) {
        if (idleTimer) clearTimeout(idleTimer);
        sendPayload(true);
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('freeze', handlePageHide, { capture: true });

    if (isMobileDevice) {
      window.addEventListener('blur', handlePageHide);
    }

    // ------------------------------------------------------------------------
    // STEP 4.7: LIFECYCLE CLEANUP (UNMOUNT PHASE)
    // ------------------------------------------------------------------------
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('freeze', handlePageHide, { capture: true });
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
      
      if (isMobileDevice) {
        window.removeEventListener('blur', handlePageHide);
      }

      const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleInteraction);
      });
      window.removeEventListener('click', handleOutboundClick, { capture: true });

      if (idleTimer) clearTimeout(idleTimer);

      if (isInitialized) {
        sendPayload(true);
      }
    };

  }, [rawPathname]);

  return null;
}