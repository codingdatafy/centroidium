/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

'use client';

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Reverse-proxied analytics ingestion edge endpoint.
 * @type {string}
 */
const METRICS_ENDPOINT = '/lib';

/**
 * Global TextEncoder instance reusable across cryptographic token derivations.
 * @type {TextEncoder}
 */
const encoder = new TextEncoder();

/**
 * Converts binary cryptographic buffer to truncated hexadecimal string.
 * 
 * @param {ArrayBuffer} buffer - Cryptographic payload hash buffer.
 * @param {number} [length=24] - Truncation output length.
 * @returns {string} Truncated hex signature.
 */
const bufferToHex = (buffer: ArrayBuffer, length = 24): string => {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  const len = Math.min(bytes.length, Math.ceil(length / 2));
  for (let i = 0; i < len; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex.substring(0, length);
};

/**
 * Generates an HMAC-like client-side cryptographic SHA-256 validation token.
 * 
 * @param {string} path - Cleaned URL pathname.
 * @param {number} timestamp - Epoch timestamp in milliseconds.
 * @returns {Promise<string>} Hexadecimal security token signature.
 */
const generateClientToken = async (path: string, timestamp: number): Promise<string> => {
  const data = `${path}-${timestamp}-CodingDatafyToken`;
  const msgBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return bufferToHex(hashBuffer, 24);
};

/**
 * Dispatches interactive custom events.
 * 
 * @param {'copy_code' | 'outbound_click'} eventType - Category of custom interaction.
 * @param {string} [targetValue] - Metadata or destination URI associated with the event.
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

  const params = new URLSearchParams({
    type: 'event',
    event_type: eventType,
    p: cleanPath,
    target: targetValue || '',
    ts: timestamp.toString(),
    token: clientToken
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(METRICS_ENDPOINT, params);
  } else {
    fetch(METRICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      keepalive: true,
    }).catch(() => {});
  }
};

if (typeof window !== 'undefined') {
  (window as any).trackEvent = trackEvent;
}

/**
 * React client component tracking pageviews, duration, bounce rate, and anti-bot validation.
 */
export default function Analytics() {
  const rawPathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const pageviewId = useRef<number | null>(null);
  const pendingPingPayload = useRef<{ durationSec: number; isBounce: boolean } | null>(null);

  const accumulatedMs = useRef<number>(0);
  const lastActiveTimestamp = useRef<number>(0);
  
  const hasSentPing = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cleanPathname = (rawPathname?.split('?')[0] || '/').replace(/\/+$/, '') || '/';

    // Prevent duplicate tracking triggers on identical path evaluations
    if (lastTrackedPath.current === cleanPathname) return;

    const sessionKeyId = `cd_pv_id_${cleanPathname}`;
    const cachedId = sessionStorage.getItem(sessionKeyId);
    pageviewId.current = cachedId ? parseInt(cachedId, 10) : null;
    pendingPingPayload.current = null;
    hasSentPing.current = false;

    // Admin opt-out flag via URL query param (?admin=true)
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('admin') === 'true') {
      localStorage.setItem('analytics-disable', 'true');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl); 
      alert('CodingDatafy: Analytics tracking is now disabled for this browser.');
    }

    const hostname = window.location.hostname;
    const isOfficialDomain = hostname === 'www.codingdatafy.com' || hostname === 'codingdatafy.com';

    // 1. User-Agent Pattern Bot Filtering
    const ua = navigator.userAgent.toLowerCase();
    const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefs|semrush|gptbot|chatgpt|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|coherebot|headlesschrome|python|node-fetch|axios|bytespider|ccbot|facebookbot|meta-external|amazonbot|petalbot|scrapy|diffbot|dotbot|rogerbot|blexbot|dataforseo|mj12bot|serpstatbot|perplexity|perplexity-user|perplexitybot|applebot|yandex|bingbot|baidu/i.test(ua);

    // 2. Automated Webdriver & Headless Environment Detection
    const isWebDriver = navigator.webdriver === true;
    const isPhantom = 'callPhantom' in window || '_phantom' in window;
    const isHeadlessWindow = 'Buffer' in window || 'emit' in window;
    const hasNoLanguages = !navigator.languages || navigator.languages.length === 0;
    const isHeadlessChrome = /headlesschrome/i.test(ua);
    const isAutomatedBot = isWebDriver || isPhantom || isHeadlessWindow || hasNoLanguages || isHeadlessChrome;

    const isExplicitlyDisabled = localStorage.getItem('analytics-disable') === 'true';

    /**
     * Inspects browser capabilities for advanced spoofed bot anomalies.
     * @returns {boolean} True if client exhibits bot traits.
     */
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

    /**
     * Inspects WebGL software rendering and hardware footprints to block cloud/datacenter instances.
     * @returns {boolean} True if client is executing inside virtualized cloud environment.
     */
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

    const isValidVisitor = isOfficialDomain && !isBotAgent && !isAutomatedBot && !isExplicitlyDisabled && !isDatacenterBot() && !isAdvancedBotGuard();

    if (!isValidVisitor) return;

    const activePath = cleanPathname;

    /**
     * Checks document metadata to verify if the rendered path represents a 404 page.
     * @returns {boolean} True if path is a 404 response.
     */
    const checkIs404Page = (): boolean => {
      const has404Meta = !!document.querySelector('meta[name="next-error"]');
      const isNotFoundTitle = document.title.toLowerCase().includes('404') || document.title.toLowerCase().includes('not found');
      const has404Element = !!document.querySelector('[data-is-404="true"]');

      return has404Meta || isNotFoundTitle || has404Element;
    };

    const is404Detected = checkIs404Page();

    let referrer = document.referrer || '';
    const sessionKey = 'cd_has_navigated';
    
    if (sessionStorage.getItem(sessionKey)) {
      referrer = window.location.origin;
    } else {
      sessionStorage.setItem(sessionKey, 'true');
    }

    accumulatedMs.current = 0;
    lastActiveTimestamp.current = 0;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const IDLE_TIMEOUT_MS = 60000;

    let hasInteracted = false;
    let isInitialized = false;

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

    /**
     * Computes exact active reading time in seconds excluding background idle state.
     * @returns {number} Active duration in seconds.
     */
    const getActiveDurationSeconds = (): number => {
      let total = accumulatedMs.current;
      if (document.visibilityState === 'visible' && lastActiveTimestamp.current > 0) {
        total += Date.now() - lastActiveTimestamp.current;
      }
      return Math.max(0, Math.round(total / 1000));
    };

    /**
     * Resets active duration timer on user interaction and schedules idle cutoff timeout.
     */
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

    /**
     * Sends duration and bounce update ping payload to edge collector.
     * Guaranteed Firefox compatibility via URLSearchParams.
     * 
     * @param {number|null} id - Primary Key ID returned from initial pageview initialization.
     * @param {number} durationSec - Calculated active duration in seconds.
     * @param {boolean} isBounce - Bounce determination indicator.
     */
    const dispatchPing = (id: number | null, durationSec: number, isBounce: boolean) => {
      const timestamp = Date.now();
      
      generateClientToken(activePath, timestamp).then((clientToken) => {
        const params = new URLSearchParams({
          p: activePath,
          r: referrer,
          d: durationSec.toString(),
          b: isBounce ? 'true' : 'false',
          is_404: is404Detected ? 'true' : 'false',
          type: 'ping',
          id: id ? id.toString() : '',
          ts: timestamp.toString(),
          token: clientToken
        });

        if (navigator.sendBeacon) {
          if (navigator.sendBeacon(METRICS_ENDPOINT, params)) return;
        }

        fetch(METRICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          keepalive: true,
        }).catch(() => {});
      });
    };

    /**
     * Handles initial pageview record creation or subsequent ping updates.
     * 
     * @param {boolean} [isUpdate=false] - True if dispatching a heartbeat update rather than initialization.
     */
    const sendPayload = async (isUpdate = false) => {
      if (isUpdate) {
        if (hasSentPing.current) return;
        hasSentPing.current = true;

        pauseTimer();

        const durationSec = getActiveDurationSeconds();
        const isBounce = !hasInteracted && durationSec < 10;
        const currentId = pageviewId.current;

        if (currentId) {
          dispatchPing(currentId, durationSec, isBounce);
        } else {
          pendingPingPayload.current = { durationSec, isBounce };
          dispatchPing(null, durationSec, isBounce);
        }
        return;
      }

      const timestamp = Date.now();
      const clientToken = await generateClientToken(activePath, timestamp);

      const params = new URLSearchParams({
        p: activePath,
        r: referrer,
        d: '0',
        b: 'true',
        is_404: is404Detected ? 'true' : 'false',
        type: 'init',
        id: '',
        ts: timestamp.toString(),
        token: clientToken
      });

      try {
        const res = await fetch(METRICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
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
              dispatchPing(data.id, pDuration, pBounce);
            }
          }
        }
      } catch {}
    };

    const handleInteraction = () => {
      hasInteracted = true;
      resetIdleTimer();
    };

    /**
     * Intercepts anchor element navigation to record external domain exit links.
     * @param {MouseEvent} event - Click event object.
     */
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

    const startTrackingIfVisible = () => {
      if (isInitialized) return;
      
      isInitialized = true;
      hasSentPing.current = false;
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

    if (document.visibilityState === 'visible') {
      startTrackingIfVisible();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!isInitialized) {
          startTrackingIfVisible();
        } else {
          hasSentPing.current = false;
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

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
      
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