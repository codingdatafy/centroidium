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

export default function Analytics() {
  const rawPathname = usePathname();

  const activePathRef = useRef<string | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const hasInteractedRef = useRef<boolean>(false);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cleanPathname = (rawPathname?.split('?')[0] || '/').replace(/\/+$/, '') || '/';

    // Admin override trigger
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('admin') === 'true') {
      localStorage.setItem('analytics-disable', 'true');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl); 
      alert('CodingDatafy: Analytics tracking is now disabled for this browser.');
    }

    // Security & Domain validation
    const hostname = window.location.hostname;
    const isOfficialDomain = hostname === 'www.codingdatafy.com' || hostname === 'codingdatafy.com';

    // Bot detection
    const ua = navigator.userAgent.toLowerCase();
    const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefs|semrush|gptbot|chatgpt|claudebot|claude-user|coherebot|headlesschrome|python|node-fetch|axios|bytespider|ccbot|facebookbot|amazonbot|petalbot|scrapy|diffbot|dotbot|rogerbot|blexbot|dataforseo|mj12bot|serpstatbot|perplexity|applebot|yandex|bingbot|baidu/i.test(ua);

    const isWebDriver = navigator.webdriver === true;
    const isPhantom = 'callPhantom' in window || '_phantom' in window;
    const isHeadlessWindow = 'Buffer' in window || 'emit' in window;
    const hasNoLanguages = !navigator.languages || navigator.languages.length === 0;
    const isAutomatedBot = isWebDriver || isPhantom || isHeadlessWindow || hasNoLanguages;

    const hasZeroDimensions = window.outerWidth === 0 && window.outerHeight === 0;
    const hasInvalidScreen = screen.width === 0 || screen.height === 0;
    const hasNoHardwareConcurrency = !navigator.hardwareConcurrency || navigator.hardwareConcurrency < 1;

    const isSoftwareWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return false;
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return false;
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
        return renderer.includes('swiftshader') || renderer.includes('llvmpipe') || renderer.includes('mesa');
      } catch {
        return false;
      }
    };

    const isDatacenterBot = hasZeroDimensions || hasInvalidScreen || hasNoHardwareConcurrency || isSoftwareWebGL();
    const isExplicitlyDisabled = localStorage.getItem('analytics-disable') === 'true';

    const isValidVisitor = isOfficialDomain && !isBotAgent && !isAutomatedBot && !isDatacenterBot && !isExplicitlyDisabled;

    if (!isValidVisitor) return;

    // Reset state for SPA route navigation
    if (activePathRef.current !== cleanPathname) {
      activePathRef.current = cleanPathname;
      isInitializedRef.current = false;
      hasInteractedRef.current = false;
      if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
    }

    const referrer = document.referrer || '';

    const sendPayload = (isUpdate = false) => {
      if (isUpdate && document.visibilityState === 'hidden') return;

      const durationSec = isUpdate && startTimeRef.current > 0 
        ? Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000)) 
        : 0;

      const isBounce = isUpdate ? (!hasInteractedRef.current && durationSec < 10) : true;

      const payload = JSON.stringify({
        p: activePathRef.current,
        r: referrer,
        d: durationSec,
        b: isBounce,
        type: isUpdate ? 'ping' : 'init'
      });

      if (isUpdate && navigator.sendBeacon) {
        if (navigator.sendBeacon(METRICS_ENDPOINT, payload)) return;
      }

      fetch(METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    const handleInteraction = () => {
      hasInteractedRef.current = true;
    };

    const scheduleHeartbeat = () => {
      if (document.visibilityState === 'hidden') return;

      const elapsedSec = startTimeRef.current > 0 ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0;
      const nextIntervalMs = elapsedSec > 60 ? 20000 : 10000;

      heartbeatTimeoutRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          sendPayload(true);
        }
        scheduleHeartbeat();
      }, nextIntervalMs);
    };

    // Main initialization function
    const tryInitialize = () => {
      if (isInitializedRef.current) return;
      if (document.visibilityState === 'hidden' && !document.hasFocus()) return;

      isInitializedRef.current = true;
      startTimeRef.current = Date.now();

      // Record Pageview
      sendPayload(false);

      // Interaction listeners
      window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
      window.addEventListener('click', handleInteraction, { once: true, passive: true });
      window.addEventListener('mousemove', handleInteraction, { once: true, passive: true });

      // Start Heartbeat
      scheduleHeartbeat();
    };

    // Event Listeners for background tab activation
    const onActivate = () => {
      tryInitialize();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tryInitialize();
      } else if (document.visibilityState === 'hidden' && isInitializedRef.current) {
        sendPayload(true);
        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
      }
    };

    const onPageHide = () => {
      if (isInitializedRef.current) sendPayload(true);
    };

    // Attach listeners
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onActivate);
    window.addEventListener('pageshow', onActivate);
    window.addEventListener('pagehide', onPageHide);

    // Initial attempt (Runs immediately if opened in active foreground tab)
    tryInitialize();

    return () => {
      if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onActivate);
      window.removeEventListener('pageshow', onActivate);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);

      if (isInitializedRef.current) {
        sendPayload(true);
      }
    };

  }, [rawPathname]);

  return null;
}