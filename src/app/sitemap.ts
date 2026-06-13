/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import type { MetadataRoute } from 'next';
import { getAllPostSlugs } from "@/lib/markdown";
import { connection } from "next/server";

const BASE_URL = 'https://www.codingdatafy.com';

/**
 * GENERATE STATIC & DYNAMIC SITEMAP ENTRIES
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. ENSURE DYNAMIC EXECUTION RUNTIME FOR REPOSITORY UPDATES
  await connection();

  // 2. Fetch all structural paths generated from the compiled content repository
  const allSlugs = getAllPostSlugs();

  const currentDate = new Date();

  const sitemapEntries = allSlugs.map((pathEntry) => {
    // Extract the flat slug array mapped directly from the updated markdown compiler logic
    const slugArray = pathEntry.slug || [];
    
    // Resolve clean routing paths for production SEO consumption
    const urlPath = slugArray.join('/');
    const fullUrlPath = urlPath === '' ? '' : `/${urlPath}`;
    
    // 3. ADAPTIVE SEO PRIORITY LOGIC
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
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: priority,
    };
  });

  return sitemapEntries;
}