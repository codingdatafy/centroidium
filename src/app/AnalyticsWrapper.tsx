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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 1. Secret Admin Access Trigger Context
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('admin') === 'true') {
      localStorage.setItem('va-disable', 'true');
      console.log('CodingDatafy: Admin mode activated. Tracking disabled.');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl); 
      alert('Success: Tracking is now disabled for this browser.');
    }
  }, []);

  if (!mounted) return null;

  // Safe parameters extraction for TypeScript typing in beforeSend
  type BeforeSendType = NonNullable<AnalyticsProps['beforeSend']>;

  return (
    <Analytics 
      // Link analytics component to Vercel secure dynamic config proxy routes
      endpoint="/va/events"
      scriptSrc="/va/lib.js"
      beforeSend={((event) => {
        // Safe context checking for window availability under hybrid environments
        if (typeof window === 'undefined') return null;

        // 1. Hostname Strict Domain Check (Allows both bare domain and www)
        const hostname = window.location.hostname;
        const isOfficialDomain = hostname === 'www.codingdatafy.com' || hostname === 'codingdatafy.com';

        // 2. Advanced Bot, Web-Crawler & AI Opt-out Regex Verification
        const ua = navigator.userAgent.toLowerCase();
        const isBotAgent = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefsbot|semrushbot|gptbot|chatgpt|claudebot|coherebot|headlesschrome|python|node-fetch|axios/i.test(ua);
        
        // 3. Client-Side Automation & Stealth Browser Fingerprinting Detection
        const isWebDriver = navigator.webdriver === true;
        
        // Detects missing browser components common in headless environment spoofing
        const hasNoPlugins = navigator.plugins && navigator.plugins.length === 0;
        const hasNoLanguages = !navigator.languages || navigator.languages.length === 0;
        
        // Evaluates if the client environment matches automated browser behavior
        const isAutomatedBot = isWebDriver || (hasNoPlugins && hasNoLanguages);

        // 4. Admin LocalStorage Privacy Verification
        const isExplicitlyDisabled = typeof window !== 'undefined' && localStorage.getItem('va-disable') === 'true';

        // 5. Boundary Logic Execution: Drop traffic event execution if anomalies are caught
        if (!isOfficialDomain || isBotAgent || isAutomatedBot || isExplicitlyDisabled) {
          console.log(`CodingDatafy Analytics: Event dropped (Domain Match: ${isOfficialDomain}, BotAgent: ${isBotAgent}, AutomatedBot: ${isAutomatedBot}, Admin Block: ${isExplicitlyDisabled})`);
          return null; 
        }

        return event;
      }) as BeforeSendType}
    />
  );
}