/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

'use client';

import { useEffect } from "react";

export default function CloudflareAnalytics() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. SECRET ADMIN ACCESS TRIGGER CONTEXT
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('admin') === 'true') {
      localStorage.setItem('cf-analytics-disable', 'true');
      console.log('CodingDatafy: Admin mode activated. Cloudflare tracking disabled.');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl); 
      alert('Success: Cloudflare tracking is now disabled for this browser.');
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
    const isExplicitlyDisabled = localStorage.getItem('cf-analytics-disable') === 'true';

    // VERIFY ALL FILTERS BEFORE INJECTING
    if (isOfficialDomain && !isBotAgent && !isAutomatedBot && !isDatacenterBot && !isExplicitlyDisabled) {
      const cfToken = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN || "";
      if (!cfToken) return;

      // DYNAMIC SCRIPT INJECTION (PREVENTS ADBLOCK DOM/ATTRIBUTE SCANNING)
      const script = document.createElement('script');
      script.src = '/scripts/app-metrics.js';
      script.defer = true;
      script.setAttribute(
        'data-cf-beacon',
        JSON.stringify({
          token: cfToken,
          spa: true,
          rum: false,
        })
      );

      document.head.appendChild(script);
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`CodingDatafy Analytics: Pageview Dropped (Domain: ${isOfficialDomain}, Bot: ${isBotAgent || isAutomatedBot || isDatacenterBot}, Admin Disabled: ${isExplicitlyDisabled})`);
    }
  }, []);

  return null;
}