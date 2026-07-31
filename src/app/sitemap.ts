/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import type { MetadataRoute } from 'next';
import { getAllPostSlugs } from "@/lib/markdown";

const BASE_URL = 'https://www.codingdatafy.com';

// Freeze the timestamp at application build time
const BUILD_DATE = new Date();

/**
 * GENERATE STATIC SITEMAP ENTRIES AT BUILD TIME
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // 1. Fetch all structural paths generated from the compiled content repository
  const allSlugs = getAllPostSlugs();

  const sitemapEntries = allSlugs.map((pathEntry) => {
    // Extract the flat slug array mapped directly from the updated markdown compiler logic
    const slugArray = pathEntry.slug || [];
    
    // Resolve clean routing paths for production SEO consumption
    const urlPath = slugArray.join('/');
    const fullUrlPath = urlPath === '' ? '' : `/${urlPath}`;
    
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
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly' as const,
      priority: priority,
    };
  });

  return sitemapEntries;
}