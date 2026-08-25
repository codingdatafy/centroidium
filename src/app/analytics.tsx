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

// Single reusable TextEncoder instance across requests
const encoder = new TextEncoder();

/**
 * Fast Buffer to Hex string converter
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

const generateClientToken = async (path: string, timestamp: number): Promise<string> => {
  const data = `${path}-${timestamp}-CodingDatafyToken`;
  const msgBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return bufferToHex(hashBuffer, 24);
};

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
  const pendingPingPayload = useRef<{ durationSec: number; isBounce: boolean } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cleanPathname = (rawPathname?.split('?')[0] || '/').replace(/\/+$/, '') || '/';

    if (lastTrackedPath.current === cleanPathname) return;

    pageviewId.current = null;
    pendingPingPayload.current = null;

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

    // Reliable JS Guard
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

    let accumulatedMs = 0;
    let lastActiveTimestamp = 0;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const IDLE_TIMEOUT_MS = 60000;

    let hasInteracted = false;
    let isInitialized = false;

    const startTimer = () => {
      if (document.visibilityState === 'visible' && lastActiveTimestamp === 0) {
        lastActiveTimestamp = Date.now();
      }
    };

    const pauseTimer = () => {
      if (lastActiveTimestamp > 0) {
        accumulatedMs += Date.now() - lastActiveTimestamp;
        lastActiveTimestamp = 0;
      }
    };

    const getActiveDurationSeconds = (): number => {
      let total = accumulatedMs;
      if (document.visibilityState === 'visible' && lastActiveTimestamp > 0) {
        total += Date.now() - lastActiveTimestamp;
      }
      return Math.max(0, Math.round(total / 1000));
    };

    const resetIdleTimer = () => {
      if (document.visibilityState !== 'visible') return;

      if (lastActiveTimestamp === 0) {
        lastActiveTimestamp = Date.now();
      }

      if (idleTimer) clearTimeout(idleTimer);

      idleTimer = setTimeout(() => {
        pauseTimer();
      }, IDLE_TIMEOUT_MS);
    };

    const dispatchPing = async (id: number, durationSec: number, isBounce: boolean) => {
      const timestamp = Date.now();
      const clientToken = await generateClientToken(activePath, timestamp);

      const payload = JSON.stringify({
        p: activePath,
        r: referrer,
        d: durationSec,
        b: isBounce,
        is_404: is404Detected,
        type: 'ping',
        id: id,
        ts: timestamp,
        token: clientToken
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(METRICS_ENDPOINT, blob)) return;
      }

      fetch(METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    const sendPayload = async (isUpdate = false) => {
      const durationSec = isUpdate ? getActiveDurationSeconds() : 0;
      const isBounce = isUpdate ? (!hasInteracted && durationSec < 10) : true;

      if (isUpdate) {
        pauseTimer();
        if (pageviewId.current) {
          await dispatchPing(pageviewId.current, durationSec, isBounce);
        } else {
          pendingPingPayload.current = { durationSec, isBounce };
        }
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
            if (pendingPingPayload.current) {
              const { durationSec: pDuration, isBounce: pBounce } = pendingPingPayload.current;
              pendingPingPayload.current = null;
              await dispatchPing(data.id, pDuration, pBounce);
            }
          }
        }
      } catch {}
    };

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
    };

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
          pauseTimer();
          if (idleTimer) clearTimeout(idleTimer);
          sendPayload(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handlePageHide = () => {
      if (isInitialized) {
        pauseTimer();
        if (idleTimer) clearTimeout(idleTimer);
        sendPayload(true);
      }
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      
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