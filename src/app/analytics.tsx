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
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. HARD DEDUPING: PREVENT DUPLICATE TRACKING
    if (lastTrackedPath.current === pathname) {
      return;
    }

    // 2. PREFETCHING & BACKGROUND LOAD GUARD
    if (document.visibilityState === 'hidden') {
      return;
    }

    // 3. SECRET ADMIN ACCESS TRIGGER CONTEXT
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('admin') === 'true') {
      localStorage.setItem('analytics-disable', 'true');
      console.log('CodingDatafy: Admin mode activated. Tracking disabled.');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl); 
      alert('Success: Tracking is now disabled for this browser.');
    }

    // 4. HOSTNAME STRICT DOMAIN CHECK
    const hostname = window.location.hostname;
    const isOfficialDomain = hostname === 'www.codingdatafy.com' || hostname === 'codingdatafy.com';

    // 5. ADVANCED BOT & CRAWLER VERIFICATION
    const ua = navigator.userAgent.toLowerCase();
    const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefsbot|semrushbot|gptbot|chatgpt|claudebot|coherebot|headlesschrome|python|node-fetch|axios/i.test(ua);

    // 6. CLIENT-SIDE AUTOMATION & STEALTH BROWSER DETECTION
    const isWebDriver = navigator.webdriver === true;
    const isPhantom = 'callPhantom' in window || '_phantom' in window;
    const isHeadlessWindow = 'Buffer' in window || 'emit' in window;
    const hasNoLanguages = !navigator.languages || navigator.languages.length === 0;
    const isAutomatedBot = isWebDriver || isPhantom || isHeadlessWindow || hasNoLanguages;

    // 7. HARDWARE & SCREEN ANOMALY DETECTION
    const hasZeroDimensions = window.outerWidth === 0 && window.outerHeight === 0;
    const hasInvalidScreen = screen.width === 0 || screen.height === 0;
    const hasNoHardwareConcurrency = !navigator.hardwareConcurrency || navigator.hardwareConcurrency < 1;

    // 8. WEBGL RENDERER DETECTION
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

    // VERIFY ALL FILTERS
    const isValidVisitor = isOfficialDomain && !isBotAgent && !isAutomatedBot && !isDatacenterBot && !isExplicitlyDisabled;

    if (!isValidVisitor) {
      return;
    }

    // =========================================================
    // SINGLE INGESTION DISPATCHER (PREVENTS DOUBLE RECORDING)
    // =========================================================
    lastTrackedPath.current = pathname;

    // Send single pageview event on active navigation
    const payload = JSON.stringify({
      p: pathname,
      r: document.referrer || '',
      d: 0,
      b: true,
    });

    fetch(METRICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});

  }, [pathname]);

  return null;
}