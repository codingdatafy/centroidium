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
  const startTime = useRef<number>(Date.now());
  const hasInteracted = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (lastTrackedPath.current === pathname) {
      return;
    }

    if (document.visibilityState === 'hidden') {
      return;
    }

    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('admin') === 'true') {
      localStorage.setItem('analytics-disable', 'true');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      return;
    }

    const hostname = window.location.hostname;
    const isOfficialDomain = hostname === 'www.codingdatafy.com' || hostname === 'codingdatafy.com';
    const ua = navigator.userAgent.toLowerCase();
    const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefsbot|semrushbot|gptbot|chatgpt|claudebot|coherebot|headlesschrome|python|node-fetch|axios/i.test(ua);
    const isExplicitlyDisabled = localStorage.getItem('analytics-disable') === 'true';

    if (!isOfficialDomain || isBotAgent || isExplicitlyDisabled) {
      return;
    }

    // 1. Send Initial Pageview (Bounce = true initially, Duration = 0)
    lastTrackedPath.current = pathname;
    startTime.current = Date.now();
    hasInteracted.current = false;

    const initialPayload = JSON.stringify({
      p: pathname,
      r: document.referrer || '',
      d: 0,
      b: true,
    });

    fetch(METRICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: initialPayload,
      keepalive: true,
    }).catch(() => {});

    // 2. Track user interaction (Scroll or Click) to drop Bounce Rate
    const handleInteraction = () => {
      hasInteracted.current = true;
    };

    window.addEventListener('scroll', handleInteraction, { once: true });
    window.addEventListener('click', handleInteraction, { once: true });

    // 3. Send Duration & Engagement on Exit (Without creating a new Pageview)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const durationSec = Math.round((Date.now() - startTime.current) / 1000);
        
        // Use sendBeacon for reliable delivery on exit (Stateless, No Cookies)
        if (navigator.sendBeacon) {
          const exitPayload = JSON.stringify({
            p: pathname,
            d: durationSec,
            b: !hasInteracted.current,
            isUpdate: true
          });
          navigator.sendBeacon(METRICS_ENDPOINT, exitPayload);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };

  }, [pathname]);

  return null;
}