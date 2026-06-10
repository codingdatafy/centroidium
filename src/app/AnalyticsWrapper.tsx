/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

'use client';

import { useEffect, useState } from "react";
import { Analytics } from '@vercel/analytics/react';

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

  return (
    <Analytics 
      beforeSend={(event) => {
        // Safe context checking for window availability under hybrid environments
        if (typeof window === 'undefined') return null;

        // 1. Hostname Strict Domain Check
        const hostname = window.location.hostname;
        const isOfficialDomain = hostname === 'www.codingdatafy.com';

        // 2. Advanced Bot, Web-Crawler & AI Opt-out Regex Verification
        const ua = navigator.userAgent.toLowerCase();
        const isBot = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|google-inspectiontool|ahrefsbot|semrushbot|gptbot|chatgpt|claudebot|coherebot|headlesschrome|python|node-fetch|axios/i.test(ua);
        
        // 3. Admin LocalStorage Privacy Verification
        const isExplicitlyDisabled = localStorage.getItem('va-disable') === 'true';

        // 4. Boundary Logic Execution: Drop traffic event execution if anomalies are caught
        if (!isOfficialDomain || isBot || isExplicitlyDisabled) {
          console.log(`CodingDatafy Analytics: Event dropped (Domain Match: ${isOfficialDomain}, Bot: ${isBot}, Admin Block: ${isExplicitlyDisabled})`);
          return null; 
        }

        return event;
      }}
    />
  );
}