import { renderMeta, renderHeader, renderFooter } from './components';

export interface LayoutOptions {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  pathname: string;
  siteName: string;
  content: string;
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
  } = options;

  const formattedTitle = title.includes(siteName) ? title : `${title} - ${siteName}`;

  const metaHtml = renderMeta({
    title: formattedTitle,
    description,
    canonicalUrl,
    siteName,
  });

  const headerHtml = renderHeader({ currentPath: pathname });
  const footerHtml = renderFooter({ siteName });

  return `<!DOCTYPE html>
<html lang="en" data-scroll-behavior="smooth">
  <head>
    ${metaHtml}
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
  </body>
</html>`;
}