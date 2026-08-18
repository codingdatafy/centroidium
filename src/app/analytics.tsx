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
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Normalize path: strip query parameters and remove trailing slashes
    const cleanPathname = (rawPathname?.split('?')[0] || '/').replace(/\/+$/, '') || '/';

    // Prevent duplicate execution for the same clean path IF ALREADY INITIALIZED
    if (lastTrackedPath.current === cleanPathname) return;

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

    // Bot agent pattern matching
    const ua = navigator.userAgent.toLowerCase();
    const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefs|semrush|gptbot|chatgpt|claudebot|claude-user|coherebot|headlesschrome|python|node-fetch|axios|bytespider|ccbot|facebookbot|amazonbot|petalbot|scrapy|diffbot|dotbot|rogerbot|blexbot|dataforseo|mj12bot|serpstatbot|perplexity|applebot|yandex|bingbot|baidu/i.test(ua);

    // Automation and headless browser detection
    const isWebDriver = navigator.webdriver === true;
    const isPhantom = 'callPhantom' in window || '_phantom' in window;
    const isHeadlessWindow = 'Buffer' in window || 'emit' in window;
    const hasNoLanguages = !navigator.languages || navigator.languages.length === 0;
    const isAutomatedBot = isWebDriver || isPhantom || isHeadlessWindow || hasNoLanguages;

    // Hardware anomaly detection
    const hasZeroDimensions = window.outerWidth === 0 && window.outerHeight === 0;
    const hasInvalidScreen = screen.width === 0 || screen.height === 0;
    const hasNoHardwareConcurrency = !navigator.hardwareConcurrency || navigator.hardwareConcurrency < 1;

    // Software WebGL renderer detection for virtualized/datacenter environments
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

    // Verify all security, bot, and domain constraints
    const isValidVisitor = isOfficialDomain && !isBotAgent && !isAutomatedBot && !isDatacenterBot && !isExplicitlyDisabled;

    if (!isValidVisitor) return;

    const activePath = cleanPathname;
    const referrer = document.referrer || '';

    let startTime = 0;
    let hasInteracted = false;
    let isInitialized = false;
    let heartbeatTimeoutId: NodeJS.Timeout | null = null;

    // Dispatch analytics payload (initial hit, interval heartbeat, or exit ping)
    const sendPayload = (isUpdate = false) => {
      if (isUpdate && document.visibilityState === 'hidden') return;

      const durationSec = isUpdate && startTime > 0 ? Math.max(0, Math.round((Date.now() - startTime) / 1000)) : 0;
      
      // Global Standard Bounce Definition: Interacted OR stayed for 10+ seconds
      const isBounce = isUpdate ? (!hasInteracted && durationSec < 10) : true;

      const payload = JSON.stringify({
        p: activePath,
        r: referrer,
        d: durationSec,
        b: isBounce,
        type: isUpdate ? 'ping' : 'init'
      });

      if (isUpdate && navigator.sendBeacon) {
        const success = navigator.sendBeacon(METRICS_ENDPOINT, payload);
        if (success) return;
      }

      // Fallback for init hits or if sendBeacon is unsupported/fails
      fetch(METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    const handleInteraction = () => {
      hasInteracted = true;
    };

    // Adaptive Heartbeat scheduler: 10s during initial minute, then 20s
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

    // Initialize session tracking only when tab becomes active and visible
    const initializeTracking = () => {
      if (isInitialized) return;
      
      isInitialized = true;
      lastTrackedPath.current = activePath; // Set only upon actual initialization
      startTime = Date.now();

      // Send initial pageview hit
      sendPayload(false);

      // Start interaction listeners
      window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
      window.addEventListener('click', handleInteraction, { once: true, passive: true });

      // Start Adaptive Heartbeat
      scheduleHeartbeat();
    };

    // Check visibility state on mount
    if (document.visibilityState === 'visible') {
      initializeTracking();
    }

    // Visibility change handler for initial activation and background updates
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!isInitialized) {
          initializeTracking();
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
      if (isInitialized) sendPayload(true);
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      if (heartbeatTimeoutId) clearTimeout(heartbeatTimeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      
      // Send final duration update on SPA route navigation unmount if active
      if (isInitialized) {
        sendPayload(true);
      }
    };

  }, [rawPathname]);

  return null;
}