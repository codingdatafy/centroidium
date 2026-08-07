/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

'use client';

import { useEffect, useState } from "react";
import { Analytics, type AnalyticsProps } from '@vercel/analytics/react';

export default function AnalyticsWrapper() {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    
    // Secret Admin Access Trigger Context
    if (typeof window !== 'undefined') {
      const queryParams = new URLSearchParams(window.location.search);
      if (queryParams.get('admin') === 'true') {
        localStorage.setItem('va-disable', 'true');
        console.log('CodingDatafy: Admin mode activated. Tracking disabled.');
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl); 
        alert('Success: Tracking is now disabled for this browser.');
      }
    }
  }, []);

  if (!mounted) return null;

  type BeforeSendType = NonNullable<AnalyticsProps['beforeSend']>;

  return (
    <Analytics 
      mode="production"
      endpoint="/va"
      scriptSrc="/va/lib.js"
      beforeSend={((event) => {
        if (typeof window === 'undefined') return null;

        // 1. Hostname Strict Domain Check
        const hostname = window.location.hostname;
        const isOfficialDomain = hostname === 'www.codingdatafy.com' || hostname === 'codingdatafy.com';

        // 2. Advanced Bot & Crawler Verification
        const ua = navigator.userAgent.toLowerCase();
        const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefsbot|semrushbot|gptbot|chatgpt|claudebot|coherebot|headlesschrome|python|node-fetch|axios/i.test(ua);
        
        // 3. Client-Side Automation & Stealth Browser Detection
        const isWebDriver = navigator.webdriver === true;
        const isPhantom = 'callPhantom' in window || '_phantom' in window;
        const isHeadlessWindow = 'Buffer' in window || 'emit' in window;
        const hasNoLanguages = !navigator.languages || navigator.languages.length === 0;
        const isAutomatedBot = isWebDriver || isPhantom || isHeadlessWindow || hasNoLanguages;

        // 4. Advanced Hardware & Screen Anomaly Detection (Datacenter / Headless Stealth Bypass)
        const hasZeroDimensions = window.outerWidth === 0 && window.outerHeight === 0;
        const hasInvalidScreen = screen.width === 0 || screen.height === 0;
        const hasNoHardwareConcurrency = !navigator.hardwareConcurrency || navigator.hardwareConcurrency < 1;

        // 5. WebGL Renderer Detection (Datacenters/VPS use SwiftShader or LLVMpipe without real GPU)
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

        // 6. Admin Privacy Verification
        const isExplicitlyDisabled = localStorage.getItem('va-disable') === 'true';

        // Filter out non-official domains, bots, automated scripts, datacenter headless browsers, or admin sessions
        if (!isOfficialDomain || isBotAgent || isAutomatedBot || isDatacenterBot || isExplicitlyDisabled) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`CodingDatafy Analytics: Pageview Dropped (Domain: ${isOfficialDomain}, Bot: ${isBotAgent || isAutomatedBot || isDatacenterBot}, Admin Disabled: ${isExplicitlyDisabled})`);
          }
          return null;
        }

        return event;
      }) as BeforeSendType}
    />
  );
}