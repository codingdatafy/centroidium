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
    let sentFinal = false;
    const referrer = document.referrer || '';

    lastTrackedPath.current = activePath;

    // Dispatch analytics payload (initial hit or exit ping)
    const sendPayload = (isFinal = false) => {
      if (isFinal && sentFinal) return; // Prevent duplicate payload for same cycle
      
      const durationSec = isFinal ? Math.max(0, Math.round((Date.now() - startTime) / 1000)) : 0;
      
      const payload = JSON.stringify({
        p: activePath,
        r: referrer,
        d: durationSec,
        b: !hasInteracted,
        type: isFinal ? 'ping' : 'init'
      });

      if (isFinal) {
        sentFinal = true;
        
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'text/plain' });
          const success = navigator.sendBeacon(METRICS_ENDPOINT, blob);
          if (success) return;
        }
      }

      // Fallback for init hits or if sendBeacon fails
      fetch(METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    // Immediate initial hit dispatch to guarantee pageview recording
    sendPayload(false);

    const handleInteraction = () => {
      hasInteracted = true;
    };

    window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
    window.addEventListener('click', handleInteraction, { once: true, passive: true });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendPayload(true);
      } else if (document.visibilityState === 'visible') {
        // Unlock sentFinal so the duration updates if user continues reading and then leaves
        sentFinal = false;
      }
    };

    // Lifecycle event listeners for page exit
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', () => sendPayload(true));

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', () => sendPayload(true));
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      
      // Force reset lock on unmount to guarantee SPA route navigation duration is recorded
      sentFinal = false;
      sendPayload(true);
    };

  }, [rawPathname]);

  return null;
}