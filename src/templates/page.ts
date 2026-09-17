// ======================================================================
// FILE: src/templates/page.ts
// ======================================================================

import { ProcessedDocument } from '../types';
import { renderLayout } from './layout';

export interface RenderPageOptions {
  doc: ProcessedDocument;
  pathname: string;
  siteName: string;
  siteUrl: string;
}

/**
 * Renders the document/article page content shell and wraps it inside the global layout shell.
 */
export function renderPage({ doc, pathname, siteName, siteUrl }: RenderPageOptions): string {
  const { meta, contentHtml, toc } = doc;

  const title = meta.title ?? `${siteName} Documentation`;
  const description =
    meta.description ?? "On a mission to build the world's largest reference and knowledge base for coding.";
  const absoluteUrl = `${siteUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;

  const customStyleTag = meta.style
    ? `<link rel="stylesheet" href="/styles/${escapeHtml(String(meta.style))}" />`
    : '';

  // Table of Contents / Sidebar Navigation component render
  const sidebarHtml =
    toc.length > 0
      ? `<aside id="sidebar">
          <nav>
            <ul>
              ${toc
                .map(
                  (item) =>
                    `<li class="toc-level-${item.level}"><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`
                )
                .join('\n              ')}
            </ul>
          </nav>
        </aside>`
      : (meta.sidebarHtml as string) ?? '';

  const mainContainerId = meta.id ? ` id="${escapeHtml(String(meta.id))}"` : '';
  const lastUpdated = meta.lastUpdated || meta.updatedAt;

  const articleFooterHtml = `
    <footer id="article-footer">
      ${
        lastUpdated
          ? `<p><time datetime="${escapeHtml(String(lastUpdated))}">Last Updated: ${escapeHtml(String(lastUpdated))}</time></p>`
          : ''
      }
      <p>
        <small>
          Published by <strong>${escapeHtml(siteName)}™ Organization</strong>. 
          Explore <a href="${escapeHtml(absoluteUrl)}">${escapeHtml(siteName)} Documentation</a>.
        </small>
      </p>
    </footer>
  `.trim();

  const pageContentHtml = `
    ${customStyleTag}
    ${sidebarHtml}
    <main id="main">
      <div${mainContainerId}>
        <article id="article">
          <header id="article-header">
            <h1 id="article-title">${escapeHtml(title)}</h1>
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