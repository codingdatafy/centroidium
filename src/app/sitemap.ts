/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import type { MetadataRoute } from 'next';
import { getAllPostSlugs, getPageData } from "@/lib/markdown";

// Enforce static generation at build time for SSG (output: 'export')
export const dynamic = 'force-static';

const BASE_URL = 'https://www.codingdatafy.com';

// Fallback timestamp if individual metadata is unavailable
const BUILD_DATE = new Date();

// Define Header & Footer route classifications for SEO priority mapping
const HEADER_ROUTES = [
  '/languages',
  '/frameworks',
  '/apis',
  '/protocols',
  '/databases',
  '/tools',
  '/compatibility',
  '/development',
  '/roadmaps',
  '/glossary'
];

const FOOTER_ROUTES = [
  '/about',
  '/terms-of-use',
  '/privacy-policy',
  '/contact',
  '/faq',
  '/contribute',
  '/sponsors'
];

/**
 * GENERATE STATIC SITEMAP ENTRIES AT BUILD TIME WITH REAL COMMIT DATES
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Fetch all structural paths generated from the compiled content repository
  const allSlugs = getAllPostSlugs();

  const sitemapEntries = await Promise.all(
    allSlugs.map(async (pathEntry) => {
      // Extract the flat slug array mapped directly from the updated markdown compiler logic
      const slugArray = pathEntry.slug || [];
      
      // Resolve clean routing paths for production SEO consumption
      const urlPath = slugArray.join('/');
      const fullUrlPath = urlPath === '' ? '' : `/${urlPath}`;
      
      // Fetch dynamic page data to extract recorded lastUpdated commit date
      const pageData = await getPageData(slugArray);
      const lastModifiedDate = pageData?.meta?.lastUpdated 
        ? new Date(pageData.meta.lastUpdated) 
        : BUILD_DATE;

      // 2. ADAPTIVE SEO PRIORITY & FREQUENCY LOGIC
      let priority = 0.7;
      let changeFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly';

      if (fullUrlPath === '') {
        // Root context (Homepage) -> Top Priority
        priority = 1.0;
        changeFrequency = 'daily';
      } else if (HEADER_ROUTES.some((route) => fullUrlPath.startsWith(route))) {
        // Primary Header Knowledge Pillars -> High Priority
        const depth = fullUrlPath.split('/').filter(Boolean).length;
        priority = depth === 1 ? 0.9 : 0.8;
        changeFrequency = 'weekly';
      } else if (FOOTER_ROUTES.some((route) => fullUrlPath.startsWith(route))) {
        // Static Utility & Legal Footer Pages -> Standard Priority
        priority = 0.5;
        changeFrequency = 'monthly';
      }

      return {
        url: `${BASE_URL}${fullUrlPath}`,
        lastModified: lastModifiedDate,
        changeFrequency,
        priority,
      };
    })
  );

  return sitemapEntries;
}