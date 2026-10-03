import { renderMeta, renderHeader, renderFooter } from './components';

export interface LayoutOptions {
  title?: string | undefined;
  description?: string | undefined;
  canonicalUrl?: string | undefined;
  pathname: string;
  siteName: string;
  content: string;
  executionTimeMs?: number | undefined;
  cacheStatus?: string | undefined;
  customStyle?: string | undefined;
}

/**
 * Native Pure-HTML String Shell Layout Replacing Next.js RootLayout
 */
export function renderLayout(options: LayoutOptions): string {
  const {
    title = 'CodingDatafy',
    description = "On a mission to build the world's largest reference and knowledge base for coding languages.",
    canonicalUrl = `https://www.codingdatafy.com${options.pathname}`,
    pathname,
    siteName,
    content,
    executionTimeMs = 0,
    cacheStatus = 'BYPASS',
    customStyle,
  } = options;

  const formattedTitle = title.includes(siteName) ? title : `${title} - ${siteName}`;

  const metaHtml = renderMeta({
    title: formattedTitle,
    description,
    canonicalUrl,
    siteName,
    customStyle,
  });

  const headerHtml = renderHeader({ currentPath: pathname });
  const footerHtml = renderFooter({ siteName });

  return `<!DOCTYPE html>
<html lang="en" data-scroll-behavior="smooth">
  <head>
    ${metaHtml}
    <meta name="server-execution-time" content="${executionTimeMs}" />
    <meta name="server-cache-status" content="${cacheStatus}" />
  </head>
  <body>
    <div id="root">
      ${headerHtml}

      <div id="content">
        ${content}
      </div>

      ${footerHtml}
    </div>

    <!-- Client-side Interactive Script -->
    <script src="/scripts/centroidium.js" defer></script>
    <script src="/scripts/lib.js" defer></script>
  </body>
</html>`;
}