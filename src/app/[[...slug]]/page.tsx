/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import { getPageData, getAllPostSlugs } from "@/lib/markdown";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

// Declaring params as Promise according to Next.js 16
interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

// Enable dynamic rendering for non-prerendered routes while preserving strict 404 evaluation
export const dynamicParams = true;

export async function generateStaticParams() {
  const paths = getAllPostSlugs();
  return paths && paths.length > 0 ? paths : [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Catch invalid paths or empty params that do not exist
  if (!slug || slug.length === 0) {
    const homeData = await getPageData(undefined);
    if (!homeData) {
      notFound();
    }
    return {
      title: homeData.meta.title,
      description: homeData.meta.description,
    };
  }

  const data = await getPageData(slug);
  
  // STRICT METADATA BOUNDARY: Explicitly trigger notFound to prevent metadata fallback loops
  if (!data) {
    notFound();
  }

  const title = data.meta.title;
  const description = data.meta.description || "Master coding with CodingDatafy expert-led documentation.";
  const fullUrl = `https://www.codingdatafy.com/${slug.join('/')}`;

  return {
    title,
    description,
    alternates: {
      canonical: fullUrl,
    },
  };
}

export default async function Page({ params }: PageProps) {
  // Await the params Promise strictly
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // Fetch markdown page data
  const data = await getPageData(slug);

  // STRICT 404 BOUNDARY:
  // Trigger absolute notFound() response if route content is completely missing
  if (!data) {
    notFound();
  }

  const absoluteUrl = `https://www.codingdatafy.com/${slug ? slug.join('/') : ''}`;

  return (
    <>
      {data.meta.style && (
        <link rel="stylesheet" href={`/styles/${data.meta.style}`} precedence="high" />
      )}

      {data.sidebarHtml && (
        <aside id="sidebar">
          <nav dangerouslySetInnerHTML={{ __html: data.sidebarHtml }} />
        </aside>
      )}

      <main id="main">
        <div id={data.meta.id || undefined}>
          <article id="article">
            <header id="article-header">
              <h1 id="article-title">{data.meta.title}</h1>
            </header>
            
            <section dangerouslySetInnerHTML={{ __html: data.contentHtml }} />

            <footer id="article-footer">
              {data.meta.lastUpdated && (
                <p>
                  <time dateTime={data.meta.lastUpdated}>
                    Last Updated: {data.meta.lastUpdated}
                  </time>
                </p>
              )}
              <p>
                <small>
                  Published by <strong>CodingDatafy™ Organization</strong>. 
                  Explore <Link href={absoluteUrl}>CodingDatafy Documentation</Link>.
                </small>
              </p>
            </footer>
          </article>
        </div>
      </main>
    </>
  );
}