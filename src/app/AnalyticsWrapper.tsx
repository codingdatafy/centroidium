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

        // 4. Admin Privacy Verification
        const isExplicitlyDisabled = localStorage.getItem('va-disable') === 'true';

        // Filter out non-official domains, bots, automated scripts, or admin sessions
        if (!isOfficialDomain || isBotAgent || isAutomatedBot || isExplicitlyDisabled) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`CodingDatafy Analytics: Pageview Dropped (Domain: ${isOfficialDomain}, Bot: ${isBotAgent || isAutomatedBot}, Admin Disabled: ${isExplicitlyDisabled})`);
          }
          return null;
        }

        return event;
      }) as BeforeSendType}
    />
  );
}