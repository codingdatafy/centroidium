/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react"; // Added Suspense for Next.js 16 dynamic rendering safety
import AnalyticsWrapper from "./AnalyticsWrapper"; 

/**
 * CONSOLIDATED SITE METADATA
 */
export const metadata: Metadata = {
  description: "On a mission to build the world's largest reference and knowledge base for coding languages.",
  metadataBase: new URL('https://www.codingdatafy.com'),
  alternates: {
    canonical: '/',
  },
  title: {
    template: "%s - CodingDatafy",
    default: "CodingDatafy - Documentation", 
  },
  icons: {
    icon: '/images/favicon.png',
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * ROOT LAYOUT COMPONENT
 */
export default function RootLayout({ children }: RootLayoutProps) {
  /**
   * STRUCTURED DATA (JSON-LD)
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "CodingDatafy",
    "url": "https://www.codingdatafy.com",
    "logo": "https://www.codingdatafy.com/images/logo.png",
    "sameAs": [
      "https://github.com/codingdatafy",
      "https://x.com/codingdatafy",
      "https://facebook.com/codingdatafy"
    ]
  };

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        {/* LINKING CORE STYLESHEET VIA ABSOLUTE PUBLIC STATIC ROUTE */}
        <link rel="stylesheet" href="/styles/centroidium.css" />
      </head>
      <body>
        {/* INJECTING STRUCTURED DATA FOR SEARCH ENGINES */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <div id="root">
          {/* APPLICATION HEADER */}
          <header id="header">
            <Link href="/" id="logo">
              <Image 
                src="/images/logo.png" 
                alt="CodingDatafy Logo" 
                width={368} 
                height={77} 
                priority
              />
            </Link>
            <nav id="navigation">
              <ul>
                <li><Link href="/">Homepage</Link></li>
                <li><Link href="/languages">Languages</Link></li>
                <li><Link href="/faq">FAQ</Link></li>
              </ul>
            </nav>
          </header>

          {/* MAIN CONTENT AREA WRAPPED IN SUSPENSE TO PREVENT UNCACHED DATA ERRORS */}
          <div id="content">
            <Suspense fallback={<div>Loading workspace...</div>}>
              {children}
            </Suspense>
          </div>

          {/* APPLICATION FOOTER */}
          <footer id="footer">
            <ul id="footer-links">
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/terms-of-use">Terms of Use</Link></li>
              <li><Link href="/privacy-policy">Privacy policy</Link></li>
              <li><Link href="/contribute">Contribute</Link></li>
            </ul>            
            <ul id="social-networks">
              <li>
                <a href="https://github.com/codingdatafy" target="_blank" rel="external noopener noreferrer">
                  <Image 
                    src="/images/github.png" 
                    alt="GitHub" 
                    width={32} 
                    height={32} 
                    loading="lazy" 
                  />
                </a>
              </li>
            </ul>
            <p>
              <small>Copyright © 2026 <strong>CodingDatafy™</strong> Organization | Content licensed under <strong>CC BY-SA 4.0</strong></small>
            </p>
          </footer>
        </div>

        {/* PERFORMANCE & AUTOMATED FILTERING ANALYTICS */}
        <AnalyticsWrapper />
        
        {/* EXTERNAL CORE SCRIPTS FROM PUBLIC DIRECTORY */}
        <script src="/scripts/centroidium.js" defer></script>
      </body>
    </html>
  );
}