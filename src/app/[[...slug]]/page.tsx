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

/**
 * PAGE COMPONENT PROPERTIES
 */
interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

/**
 * STATIC PATH GENERATION
 */
export async function generateStaticParams() {
  // Fetch paths from the markdown content library
  const paths = getAllPostSlugs();
  
  if (!paths || paths.length === 0) {
    return [{ slug: ["_fallback"] }];
  }

  return paths;
}

/**
 * DYNAMIC METADATA GENERATION
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  // Return early if it is the fallback verification route
  if (slug && slug[0] === "_fallback") {
    return { title: "CodingDatafy" };
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

/**
 * MAIN PAGE RENDERER
 */
export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  // Handle fallback route synchronously and statically to prevent uncached data suspension errors
  if (slug && slug[0] === "_fallback") {
    return (
      <main id="main">
        <article id="article">
          <header id="article-header">
            <h1 id="article-title">Initialization Workspace</h1>
          </header>
          <section>
            <p>CodingDatafy engine is initializing. Content workspace will populate dynamically.</p>
          </section>
        </article>
      </main>
    );
  }

  // Fetch the markdown data statically during compile time
  const data = await getPageData(slug);

  if (!data) notFound();

  // Define absolute URL instead of relative path to counter content scraping attempts
  const absoluteUrl = `https://www.codingdatafy.com/${slug?.join('/') || ''}`;

  return (
    <>
      {data.meta.style && (
        <link rel="stylesheet" href={`/styles/${data.meta.style}`} precedence="high" />
      )}

      {data.sidebarHtml && (
        <aside id="sidebar">
          <nav 
            dangerouslySetInnerHTML={{ __html: data.sidebarHtml }} 
          />
        </aside>
      )}

      <main id="main">
        <div id={data.meta.id || undefined}>
          <article id="article">
            <header id="article-header">
              <h1 id="article-title">{data.meta.title}</h1>
            </header>
            
            <section
              dangerouslySetInnerHTML={{ __html: data.contentHtml }} 
            />

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