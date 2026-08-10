/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

'use client';

import { useEffect } from "react";

// OBFUSCATED SERVICE ENDPOINT
const METRICS_ENDPOINT = '/lib';

export default function Analytics() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. SECRET ADMIN ACCESS TRIGGER CONTEXT
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('admin') === 'true') {
      localStorage.setItem('analytics-disable', 'true');
      console.log('CodingDatafy: Admin mode activated. Tracking disabled.');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl); 
      alert('Success: Tracking is now disabled for this browser.');
    }

    // 2. HOSTNAME STRICT DOMAIN CHECK
    const hostname = window.location.hostname;
    const isOfficialDomain = hostname === 'www.codingdatafy.com' || hostname === 'codingdatafy.com';

    // 3. ADVANCED BOT & CRAWLER VERIFICATION
    const ua = navigator.userAgent.toLowerCase();
    const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefsbot|semrushbot|gptbot|chatgpt|claudebot|coherebot|headlesschrome|python|node-fetch|axios/i.test(ua);

    // 4. CLIENT-SIDE AUTOMATION & STEALTH BROWSER DETECTION
    const isWebDriver = navigator.webdriver === true;
    const isPhantom = 'callPhantom' in window || '_phantom' in window;
    const isHeadlessWindow = 'Buffer' in window || 'emit' in window;
    const hasNoLanguages = !navigator.languages || navigator.languages.length === 0;
    const isAutomatedBot = isWebDriver || isPhantom || isHeadlessWindow || hasNoLanguages;

    // 5. HARDWARE & SCREEN ANOMALY DETECTION (DATACENTER / HEADLESS STEALTH BYPASS)
    const hasZeroDimensions = window.outerWidth === 0 && window.outerHeight === 0;
    const hasInvalidScreen = screen.width === 0 || screen.height === 0;
    const hasNoHardwareConcurrency = !navigator.hardwareConcurrency || navigator.hardwareConcurrency < 1;

    // 6. WEBGL RENDERER DETECTION
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

    // 7. ADMIN PRIVACY VERIFICATION
    const isExplicitlyDisabled = localStorage.getItem('analytics-disable') === 'true';

    // VERIFY ALL FILTERS
    const isValidVisitor = isOfficialDomain && !isBotAgent && !isAutomatedBot && !isDatacenterBot && !isExplicitlyDisabled;

    if (!isValidVisitor) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`CodingDatafy Analytics: Pageview Dropped (Domain: ${isOfficialDomain}, Bot: ${isBotAgent || isAutomatedBot || isDatacenterBot}, Admin Disabled: ${isExplicitlyDisabled})`);
      }
      return;
    }

    // =========================================================
    // INGESTION & ENGAGEMENT DISPATCHER
    // =========================================================
    const startTime = Date.now();
    let hasInteracted = false;

    // Dispatch payload with minimal key structures
    const sendMetrics = (isFinal = false) => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const isBounce = !hasInteracted && duration < 10;

      const payload = JSON.stringify({
        p: window.location.pathname,
        r: document.referrer || '',
        d: duration,
        b: isBounce,
      });

      if (isFinal && navigator.sendBeacon) {
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

    // Flag user interaction to compute accurate bounce rate
    const registerInteraction = () => {
      hasInteracted = true;
    };

    window.addEventListener('scroll', registerInteraction, { once: true, passive: true });
    window.addEventListener('click', registerInteraction, { once: true });

    sendMetrics(false);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendMetrics(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('scroll', registerInteraction);
      window.removeEventListener('click', registerInteraction);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}