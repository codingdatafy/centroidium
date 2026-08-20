/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

'use client';

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const METRICS_ENDPOINT = '/lib';

/**
 * Generates a SHA-256 cryptographic signature tied to the path and timestamp
 */
const generateClientToken = async (path: string, timestamp: number): Promise<string> => {
  const data = `${path}-${timestamp}-CodingDatafyToken`;
  const msgBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
};

/**
 * Event tracking utility for interactive elements
 * Supports: 'copy_code', 'search', 'outbound_click'
 */
export const trackEvent = async (
  eventType: 'copy_code' | 'search' | 'outbound_click',
  targetValue?: string,
  hasResults?: boolean
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
    has_results: typeof hasResults === 'boolean' ? hasResults : null,
    ts: timestamp,
    token: clientToken
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(METRICS_ENDPOINT, payload);
  } else {
    fetch(METRICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
};

export default function Analytics() {
  const rawPathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const pageviewId = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Normalize path: strip query parameters and remove trailing slashes
    const cleanPathname = (rawPathname?.split('?')[0] || '/').replace(/\/+$/, '') || '/';

    // Prevent duplicate execution for the same clean path
    if (lastTrackedPath.current === cleanPathname) return;

    // Reset pageview ID on path change
    pageviewId.current = null;

    // Admin override trigger to disable analytics for testing/maintenance
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('admin') === 'true') {
      localStorage.setItem('analytics-disable', 'true');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl); 
      alert('CodingDatafy: Analytics tracking is now disabled for this browser.');
    }

    // Domain validation check
    const hostname = window.location.hostname;
    const isOfficialDomain = hostname === 'www.codingdatafy.com' || hostname === 'codingdatafy.com';

    // Comprehensive bot agent pattern matching including AI search fetchers
    const ua = navigator.userAgent.toLowerCase();
    const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefs|semrush|gptbot|chatgpt|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|coherebot|headlesschrome|python|node-fetch|axios|bytespider|ccbot|facebookbot|meta-external|amazonbot|petalbot|scrapy|diffbot|dotbot|rogerbot|blexbot|dataforseo|mj12bot|serpstatbot|perplexity|perplexity-user|perplexitybot|applebot|yandex|bingbot|baidu/i.test(ua);

    // Automation and headless browser detection
    const isWebDriver = navigator.webdriver === true;
    const isPhantom = 'callPhantom' in window || '_phantom' in window;
    const isHeadlessWindow = 'Buffer' in window || 'emit' in window;
    const hasNoLanguages = !navigator.languages || navigator.languages.length === 0;
    const isHeadlessChrome = /headlesschrome/i.test(ua);
    const isAutomatedBot = isWebDriver || isPhantom || isHeadlessWindow || hasNoLanguages || isHeadlessChrome;

    const isExplicitlyDisabled = localStorage.getItem('analytics-disable') === 'true';

    // Hardware & WebGL anomaly detection
    const isDatacenterBot = () => {
      if (document.visibilityState === 'hidden') return false;

      const hasZeroDimensions = window.outerWidth === 0 && window.outerHeight === 0;
      const hasInvalidScreen = screen.width === 0 || screen.height === 0;
      const hasNoHardwareConcurrency = !navigator.hardwareConcurrency || navigator.hardwareConcurrency < 1;

      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return hasZeroDimensions || hasInvalidScreen || hasNoHardwareConcurrency;
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return hasZeroDimensions || hasInvalidScreen || hasNoHardwareConcurrency;
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
        const isSoftware = renderer.includes('swiftshader') || renderer.includes('llvmpipe') || renderer.includes('mesa');
        return hasZeroDimensions || hasInvalidScreen || hasNoHardwareConcurrency || isSoftware;
      } catch {
        return false;
      }
    };

    // Verify security and bot constraints
    const isValidVisitor = isOfficialDomain && !isBotAgent && !isAutomatedBot && !isExplicitlyDisabled && !isDatacenterBot();

    if (!isValidVisitor) return;

    const activePath = cleanPathname;
    const referrer = document.referrer || '';

    let startTime = 0;
    let hasInteracted = false;
    let heartbeatTimeoutId: NodeJS.Timeout | null = null;
    let isInitialized = false;

    // Dispatch analytics payload
    const sendPayload = async (isUpdate = false) => {
      const durationSec = isUpdate && startTime > 0 ? Math.max(0, Math.round((Date.now() - startTime) / 1000)) : 0;
      const isBounce = isUpdate ? (!hasInteracted && durationSec < 10) : true;

      const timestamp = Date.now();
      const clientToken = await generateClientToken(activePath, timestamp);

      const payload = JSON.stringify({
        p: activePath,
        r: referrer,
        d: durationSec,
        b: isBounce,
        type: isUpdate ? 'ping' : 'init',
        id: isUpdate ? pageviewId.current : null,
        ts: timestamp,
        token: clientToken
      });

      // Prefer sendBeacon for page unload / visibility changes
      if (isUpdate && navigator.sendBeacon) {
        const success = navigator.sendBeacon(METRICS_ENDPOINT, payload);
        if (success) return;
      }

      try {
        const res = await fetch(METRICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });

        // Store the returned pageview ID for subsequent ping updates
        if (!isUpdate && res.ok) {
          const data = await res.json();
          if (data?.id) {
            pageviewId.current = data.id;
          }
        }
      } catch {}
    };

    const handleInteraction = () => {
      hasInteracted = true;
    };

    // Global listener for automatic outbound link tracking
    const handleOutboundClick = (event: MouseEvent) => {
      const targetAnchor = (event.target as HTMLElement).closest('a');
      if (!targetAnchor) return;

      const href = targetAnchor.getAttribute('href');
      if (!href) return;

      // Check if the link points to an external site
      const isExternal = href.startsWith('http') && 
                         !href.includes('codingdatafy.com') && 
                         !href.includes(window.location.hostname);

      if (isExternal) {
        trackEvent('outbound_click', href);
      }
    };

    // Adaptive Heartbeat scheduler
    const scheduleHeartbeat = () => {
      if (document.visibilityState === 'hidden') return;

      const elapsedSec = startTime > 0 ? Math.round((Date.now() - startTime) / 1000) : 0;
      const nextIntervalMs = elapsedSec > 60 ? 20000 : 10000;

      heartbeatTimeoutId = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          sendPayload(true);
        }
        scheduleHeartbeat();
      }, nextIntervalMs);
    };

    // Function to start tracking ONLY when page is visible to user
    const startTrackingIfVisible = () => {
      if (isInitialized) return;
      
      isInitialized = true;
      lastTrackedPath.current = cleanPathname;
      startTime = Date.now();

      // 1. Send the initial pageview hit ONLY when tab becomes visible
      sendPayload(false);

      // 2. Start interaction and outbound click listeners
      window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
      window.addEventListener('click', handleInteraction, { once: true, passive: true });
      window.addEventListener('click', handleOutboundClick, { capture: true, passive: true });

      // 3. Start heartbeat
      scheduleHeartbeat();
    };

    // Deferred Execution Logic
    if (document.visibilityState === 'visible') {
      startTrackingIfVisible();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!isInitialized) {
          startTrackingIfVisible();
        } else {
          scheduleHeartbeat();
        }
      } else if (document.visibilityState === 'hidden') {
        if (isInitialized) {
          sendPayload(true);
          if (heartbeatTimeoutId) clearTimeout(heartbeatTimeoutId);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handlePageHide = () => {
      if (isInitialized) {
        sendPayload(true);
      }
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      if (heartbeatTimeoutId) clearTimeout(heartbeatTimeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('click', handleOutboundClick, { capture: true });

      if (isInitialized) {
        sendPayload(true);
      }
    };

  }, [rawPathname]);

  return null;
}