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
  const trackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cleanPathname = (rawPathname?.split('?')[0] || '/').replace(/\/+$/, '') || '/';

    if (trackedPathRef.current === cleanPathname) return;

    // Admin override trigger
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
    const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefs|semrush|gptbot|chatgpt|claudebot|claude-user|coherebot|headlesschrome|python|node-fetch|axios|bytespider|ccbot|facebookbot|meta-external|amazonbot|petalbot|scrapy|diffbot|dotbot|rogerbot|blexbot|dataforseo|mj12bot|serpstatbot|perplexity|applebot|yandex|bingbot|baidu/i.test(ua);

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

    const activePath = cleanPathname;
    const referrer = document.referrer || '';

    let startTime = 0;
    let hasInteracted = false;
    let pageviewSent = false;
    let heartbeatTimeoutId: NodeJS.Timeout | null = null;
    let activeRecordId: number | null = null;

    const sendPayload = async (isUpdate = false) => {
      if (isUpdate && document.visibilityState === 'hidden') return;

      const durationSec = isUpdate && startTime > 0 ? Math.max(0, Math.round((Date.now() - startTime) / 1000)) : 0;
      const isBounce = isUpdate ? (!hasInteracted && durationSec < 10) : true;

      const payload = JSON.stringify({
        p: activePath,
        r: referrer,
        d: durationSec,
        b: isBounce,
        type: isUpdate ? 'ping' : 'init',
        id: activeRecordId
      });

      if (isUpdate && navigator.sendBeacon) {
        const success = navigator.sendBeacon(METRICS_ENDPOINT, payload);
        if (success) return;
      }

      try {
        const res = await fetch(METRICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
        
        if (!isUpdate && res.ok) {
          const data = await res.json();
          if (data?.id) activeRecordId = data.id;
        }
      } catch {}
    };

    const handleInteraction = () => {
      hasInteracted = true;
    };

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

    const triggerInitialization = () => {
      if (pageviewSent) return;

      pageviewSent = true;
      trackedPathRef.current = activePath;
      startTime = Date.now();

      sendPayload(false);

      window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
      window.addEventListener('click', handleInteraction, { once: true, passive: true });

      scheduleHeartbeat();
    };

    if (document.visibilityState === 'visible') {
      triggerInitialization();
    }

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        triggerInitialization();
      } else if (document.visibilityState === 'hidden' && pageviewSent) {
        sendPayload(true);
        if (heartbeatTimeoutId) clearTimeout(heartbeatTimeoutId);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);
    window.addEventListener('pageshow', onVisibilityOrFocus);

    const handlePageHide = () => {
      if (pageviewSent) sendPayload(true);
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      if (heartbeatTimeoutId) clearTimeout(heartbeatTimeoutId);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
      window.removeEventListener('pageshow', onVisibilityOrFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);

      if (pageviewSent) {
        sendPayload(true);
      }
    };

  }, [rawPathname]);

  return null;
}