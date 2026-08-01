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

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateStaticParams() {
  const paths = getAllPostSlugs();
  return paths && paths.length > 0 ? paths : [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  // Clean invalid character routes directly
  if (slug && slug.some(segment => segment.includes('$'))) {
    return {};
  }

  const data = await getPageData(slug);
  if (!data) return {};

  const title = data.meta.title;
  const description = data.meta.description || "Master coding with CodingDatafy expert-led documentation.";
  const fullUrl = `https://www.codingdatafy.com/${slug?.join('/') || ''}`;
  const isHomePage = !slug || slug.length === 0;

  return {
    title,
    description,
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: 'CodingDatafy',
      images: [
        {
          url: '/images/icon.png',
          width: 1200,
          height: 630,
          alt: `CodingDatafy - ${title}`,
        },
      ],
      type: isHomePage ? 'website' : 'article',
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  // 1. Block invalid symbols like '$' early to avoid unexpected mapping
  if (slug && slug.some(segment => segment.includes('$'))) {
    notFound();
  }

  // Fetch the markdown data
  const data = await getPageData(slug);

  // 2. Strict 404 boundary
  if (!data) {
    notFound();
  }

  const absoluteUrl = `https://www.codingdatafy.com/${slug?.join('/') || ''}`;

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