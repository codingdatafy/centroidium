/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";

/**
 * Prevent dynamic metadata inference errors during SSG prerender in Next.js 16
 */
export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The requested page could not be found on CodingDatafy.",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Catch-all route component for handling unknown and invalid URLs.
 * Triggers the default Next.js notFound() status to serve the custom 404 page.
 */
export default function NotFoundCatchAll() {
  notFound();
}