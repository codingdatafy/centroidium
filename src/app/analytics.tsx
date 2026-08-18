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
const HEARTBEAT_INTERVAL_MS = 10000; // Dispatch a duration heartbeat ping every 10 seconds

export default function Analytics() {
  const rawPathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Normalize path: strip query parameters and remove trailing slashes
    const cleanPathname = (rawPathname?.split('?')[0] || '/').replace(/\/+$/, '') || '/';

    // Prevent duplicate execution for the same clean path
    if (lastTrackedPath.current === cleanPathname) return;

    // Skip tracking if page is loaded in the background
    if (document.visibilityState === 'hidden') return;

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
    const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefsbot|semrushbot|gptbot|chatgpt|claudebot|coherebot|headlesschrome|python|node-fetch|axios/i.test(ua);

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

    // Track active path and start time locally for clean exit/transition logging
    const activePath = cleanPathname;
    const startTime = Date.now();
    let hasInteracted = false;
    const referrer = document.referrer || '';

    lastTrackedPath.current = activePath;

    // Dispatch analytics payload (initial hit, interval heartbeat, or exit ping)
    const sendPayload = (isUpdate = false) => {
      // Do not send updates when the document is hidden in the background
      if (isUpdate && document.visibilityState === 'hidden') return;

      const durationSec = isUpdate ? Math.max(0, Math.round((Date.now() - startTime) / 1000)) : 0;
      
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

    // 1. Immediate initial hit dispatch to guarantee pageview recording
    sendPayload(false);

    const handleInteraction = () => {
      hasInteracted = true;
    };

    window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
    window.addEventListener('click', handleInteraction, { once: true, passive: true });

    // 2. Periodic heartbeat ping to continually persist active duration before abrupt browser exit
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendPayload(true);
      }
    }, HEARTBEAT_INTERVAL_MS);

    // 3. Document lifecycle listeners for tab switching, visibility shifts, and page exit
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendPayload(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', () => sendPayload(true));

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', () => sendPayload(true));
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      
      // Send final duration update on SPA route navigation unmount
      sendPayload(true);
    };

  }, [rawPathname]);

  return null;
}