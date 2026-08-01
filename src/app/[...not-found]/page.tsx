/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import { notFound } from "next/navigation";

/**
 * Catch-all route component for handling unknown and invalid URLs.
 * Triggers the default Next.js notFound() status to serve the custom 404 page.
 */
export default function NotFoundCatchAll() {
  notFound();
}