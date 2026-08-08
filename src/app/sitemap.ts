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

      // 2. ADAPTIVE SEO PRIORITY LOGIC
      let priority = 0.7;
      
      if (fullUrlPath === '') {
        // Root context (Homepage) maps to absolute maximum index priority
        priority = 1.0;
      } else if (fullUrlPath.startsWith('/languages')) {
        // Prioritize primary and secondary programming documentation directory paths higher
        const depth = fullUrlPath.split('/').filter(Boolean).length;
        priority = depth <= 2 ? 0.9 : 0.8;
      }

      return {
        url: `${BASE_URL}${fullUrlPath}`,
        lastModified: lastModifiedDate,
        changeFrequency: 'weekly' as const,
        priority: priority,
      };
    })
  );

  return sitemapEntries;
}