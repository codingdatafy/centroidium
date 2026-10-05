import type { ProcessedDocument } from '../types';
import { renderLayout } from './layout';

export interface RenderPageOptions {
  doc: ProcessedDocument;
  pathname: string;
  siteName: string;
  siteUrl: string;
  executionTimeMs?: number | undefined;
  cacheStatus?: string | undefined;
}

const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Helper to convert YYYY-MM-DD or ISO strings to "D month YYYY"
 */
function formatDate(dateStr: string): { isoDate: string; formattedDate: string } | null {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return null;
  }

  const isoDate = date.toISOString().split('T')[0] ?? dateStr;

  new Intl.DateTimeFormat('default', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const day = date.getUTCDate();
  const month = ENGLISH_MONTHS[date.getUTCMonth()] ?? '';
  const year = date.getUTCFullYear();
  const formattedDate = `${day} ${month} ${year}`;

  return { isoDate, formattedDate };
}

/**
 * Renders the document/article page content shell and wraps it inside the global layout shell.
 */
export function renderPage({ doc, pathname, siteName, siteUrl, executionTimeMs = 0, cacheStatus = 'BYPASS' }: RenderPageOptions): string {
  const { meta, contentHtml, tocHtml } = doc;

  const title = meta.title ?? `${siteName} Documentation`;
  const description =
    meta.description ?? "On a mission to build the world's largest reference and knowledge base for coding.";
  const absoluteUrl = `${siteUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;

  const customStyle = meta.style ? String(meta.style) : undefined;
  const sidebarHtml = (meta.sidebarHtml as string) ?? '';
  const mainContainerId = meta.id ? ` id="${escapeHtml(String(meta.id))}"` : '';
  const rawBreadcrumb = meta.breadcrumb;
  const breadcrumb = typeof rawBreadcrumb === 'string' ? rawBreadcrumb : undefined;

  const rawLastUpdated = (meta.updatedAt || meta.lastUpdated || meta.publishedAt) as string | undefined;
  const parsedDate = rawLastUpdated ? formatDate(String(rawLastUpdated)) : null;

  const articleFooterHtml = `
    <footer id="article-footer">
      ${
        parsedDate
          ? `<p>Last Updated: <time datetime="${escapeHtml(parsedDate.isoDate)}">${escapeHtml(parsedDate.formattedDate)}</time></p>`
          : ''
      }
    </footer>
  `.trim();

  const tocBlock = tocHtml ? `\n\t\t\t\t\t\t${tocHtml}` : '';

  const pageContentHtml = `
    ${sidebarHtml}
    <main id="main">
      <div${mainContainerId}>
        <article id="article">
          <header id="article-header">
            <h1 id="article-title">${escapeHtml(title)}</h1>${tocBlock}
          </header>

          <div>${contentHtml}</div>

          ${articleFooterHtml}
        </article>
      </div>
    </main>
  `.trim();

  return renderLayout({
    title,
    description,
    canonicalUrl: absoluteUrl,
    pathname,
    siteName,
    content: pageContentHtml,
    executionTimeMs,
    cacheStatus,
    customStyle,
    breadcrumb,
  });
}

/**
 * Escapes HTML characters for string safety
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}