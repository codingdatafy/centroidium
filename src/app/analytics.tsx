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
 * Generates a timed cryptographic SHA-256 client token for API verification
 */
const generateClientToken = async (path: string, timestamp: number): Promise<string> => {
  const data = `${path}-${timestamp}-CodingDatafyToken`;
  const msgBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
};

/**
 * Custom event tracking method (copy_code, outbound_click)
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

if (typeof window !== 'undefined') {
  (window as any).trackEvent = trackEvent;
}

export default function Analytics() {
  const rawPathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const pageviewId = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cleanPathname = (rawPathname?.split('?')[0] || '/').replace(/\/+$/, '') || '/';

    if (lastTrackedPath.current === cleanPathname) return;

    pageviewId.current = null;

    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('admin') === 'true') {
      localStorage.setItem('analytics-disable', 'true');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl); 
      alert('CodingDatafy: Analytics tracking is now disabled for this browser.');
    }

    const hostname = window.location.hostname;
    const isOfficialDomain = hostname === 'www.codingdatafy.com' || hostname === 'codingdatafy.com';

    const ua = navigator.userAgent.toLowerCase();
    const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefs|semrush|gptbot|chatgpt|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|coherebot|headlesschrome|python|node-fetch|axios|bytespider|ccbot|facebookbot|meta-external|amazonbot|petalbot|scrapy|diffbot|dotbot|rogerbot|blexbot|dataforseo|mj12bot|serpstatbot|perplexity|perplexity-user|perplexitybot|applebot|yandex|bingbot|baidu/i.test(ua);

    const isWebDriver = navigator.webdriver === true;
    const isPhantom = 'callPhantom' in window || '_phantom' in window;
    const isHeadlessWindow = 'Buffer' in window || 'emit' in window;
    const hasNoLanguages = !navigator.languages || navigator.languages.length === 0;
    const isHeadlessChrome = /headlesschrome/i.test(ua);
    const isAutomatedBot = isWebDriver || isPhantom || isHeadlessWindow || hasNoLanguages || isHeadlessChrome;

    const isExplicitlyDisabled = localStorage.getItem('analytics-disable') === 'true';

    // Reliable JS Guard for Detecting Automated Headless Browsers
    const isAdvancedBotGuard = (): boolean => {
      try {
        // 1. Detect Outer/Screen Dimensions anomalies (Playwright/Puppeteer default overrides)
        const isScreenMismatch = screen.width > 0 && screen.height > 0 && 
          (window.outerWidth > screen.availWidth + 100 || window.outerHeight > screen.availHeight + 100);
        
        // 2. Check Connection RTT/Downlink zero anomaly
        const navConn = (navigator as any).connection;
        const hasZeroRttConnection = navConn && navConn.rtt === 0 && navConn.downlink === 0;

        // 3. Detect Mac Chrome Headless Anomaly
        const isMacChromeBot = /Macintosh/i.test(ua) && 
          window.devicePixelRatio === 1 && 
          screen.colorDepth < 24;

        // 4. Detect Puppeteer/Playwright Permissions API spoofing
        const isPermissionsSpoofed = 'permissions' in navigator && 
          navigator.permissions.query.toString().includes('native code') === false;

        return isScreenMismatch || hasZeroRttConnection || isMacChromeBot || isPermissionsSpoofed;
      } catch {
        return false;
      }
    };

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
        
        // Dynamic Canvas Check
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

    let startTime = 0;
    let hasInteracted = false;
    let heartbeatTimeoutId: NodeJS.Timeout | null = null;
    let isInitialized = false;
    let isPurgedBot = false; // Flag to stop execution if worker purges bot

    const sendPayload = async (isUpdate = false) => {
      if (isPurgedBot) return;

      const durationSec = isUpdate && startTime > 0 ? Math.max(0, Math.round((Date.now() - startTime) / 1000)) : 0;
      const isBounce = isUpdate ? (!hasInteracted && durationSec < 10) : true;

      const timestamp = Date.now();
      const clientToken = await generateClientToken(activePath, timestamp);

      const payload = JSON.stringify({
        p: activePath,
        r: referrer,
        d: durationSec,
        b: isBounce,
        is_404: is404Detected,
        type: isUpdate ? 'ping' : 'init',
        id: pageviewId.current,
        ts: timestamp,
        token: clientToken
      });

      // Use fetch instead of sendBeacon when available to read response status from Worker
      try {
        const res = await fetch(METRICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.status === 'bot_ping_purged') {
            isPurgedBot = true;
            if (heartbeatTimeoutId) clearTimeout(heartbeatTimeoutId);
            return;
          }
          if (!isUpdate && data?.id) {
            pageviewId.current = data.id;
          }
        }
      } catch {}
    };

    const handleInteraction = () => {
      hasInteracted = true;
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

    const scheduleHeartbeat = () => {
      if (document.visibilityState === 'hidden' || isPurgedBot) return;

      const elapsedSec = startTime > 0 ? Math.round((Date.now() - startTime) / 1000) : 0;
      const nextIntervalMs = elapsedSec > 60 ? 20000 : 10000;

      heartbeatTimeoutId = setTimeout(() => {
        if (document.visibilityState === 'visible' && !isPurgedBot) {
          sendPayload(true);
          scheduleHeartbeat();
        }
      }, nextIntervalMs);
    };

    const startTrackingIfVisible = () => {
      if (isInitialized) return;
      
      isInitialized = true;
      lastTrackedPath.current = cleanPathname;
      startTime = Date.now();

      sendPayload(false);

      window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
      window.addEventListener('click', handleInteraction, { once: true, passive: true });
      window.addEventListener('click', handleOutboundClick, { capture: true, passive: true });

      scheduleHeartbeat();
    };

    if (document.visibilityState === 'visible') {
      startTrackingIfVisible();
    }

    const handleVisibilityChange = () => {
      if (isPurgedBot) return;

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
      if (isInitialized && !isPurgedBot) {
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

      if (isInitialized && !isPurgedBot) {
        sendPayload(true);
      }
    };

  }, [rawPathname]);

  return null;
}