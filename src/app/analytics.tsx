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
// BLOCK 2: CRYPTOGRAPHIC TOKEN GENERATORS
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

// ============================================================================
// BLOCK 3: EVENT TRACKING EXPORT & GLOBAL BINDING
// ============================================================================

/**
 * Programmatically tracks user interactions (e.g. code copy, outbound links).
 */
export const trackEvent = async (
  eventType: 'copy_code' | 'outbound_click' | 'site_search',
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

  // Track the last tracked path to avoid duplicate triggers on identical route evaluations
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    // ------------------------------------------------------------------------
    // STEP 4.1: ENVIRONMENT & INITIALIZATION VALIDATION
    // ------------------------------------------------------------------------
    if (typeof window === 'undefined') return;

    const cleanPathname = (rawPathname?.split('?')[0] || '/').replace(/\/+$/, '') || '/';

    // Prevent duplicate triggers on identical route evaluations
    if (lastTrackedPath.current === cleanPathname) return;

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
    // STEP 4.3: PAGE STATE PARSING & PAGEVIEW DISPATCH
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
    const referrer = document.referrer || '';

    /** Sends initial pageview logging payload */
    const sendPageview = async () => {
      lastTrackedPath.current = activePath;

      const timestamp = Date.now();
      const clientToken = await generateClientToken(activePath, timestamp);

      const payload = JSON.stringify({
        p: activePath,
        r: referrer,
        is_404: is404Detected,
        type: 'init',
        ts: timestamp,
        token: clientToken
      });

      try {
        fetch(METRICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      } catch {}
    };

    // ------------------------------------------------------------------------
    // STEP 4.4: VISIBILITY GUARD & INTERACTION LISTENERS
    // ------------------------------------------------------------------------
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

    /**
     * Lazy Pageview Dispatcher:
     * Triggered when the document transitions from hidden (background tab) to visible.
     */
    const triggerPageviewIfVisible = () => {
      if (document.visibilityState === 'visible') {
        if (lastTrackedPath.current !== activePath) {
          sendPageview();
        }
      }
    };

    // Execute tracking immediately if visible, otherwise attach visibilitychange handler
    if (document.visibilityState === 'visible') {
      sendPageview();
    } else {
      document.addEventListener('visibilitychange', triggerPageviewIfVisible, { once: true });
    }

    // Event bindings
    window.addEventListener('click', handleOutboundClick, { capture: true, passive: true });

    // ------------------------------------------------------------------------
    // STEP 4.5: CLEANUP
    // ------------------------------------------------------------------------
    return () => {
      document.removeEventListener('visibilitychange', triggerPageviewIfVisible);
      window.removeEventListener('click', handleOutboundClick, { capture: true });
    };

  }, [rawPathname]);

  return null;
}