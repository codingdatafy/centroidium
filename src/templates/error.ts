import { renderLayout } from './layout';

export interface RenderErrorOptions {
  statusCode?: number;
  message?: string;
  digest?: string;
  siteName: string;
  pathname?: string;
}

/**
 * Renders the 500 System Exception/Runtime Error template wrapped in the global layout shell.
 */
export function renderError({
  statusCode = 500,
  message = 'An unexpected runtime error occurred',
  digest,
  siteName,
  pathname = '/',
}: RenderErrorOptions): string {
  const diagnosticTag = digest
    ? `<p>Diagnostic ID: <code>${escapeHtml(digest)}</code></p>`
    : '';

  const content = `
    <main class="main-error">
      <article class="article-error">
        <header class="header-error">
          <h1 class="title-error">${statusCode} - System Exception</h1>
          <h2>${escapeHtml(message)}</h2>
        </header>

        <div>
          <p>We apologize, but an unexpected error occurred while processing this request.</p>

          ${diagnosticTag}

          <nav class="nav-error">
            <button onclick="window.location.reload();" aria-label="Attempt to recover from error">
              Try again
            </button>

            <span> or </span>

            <a href="/">
              Return Home
            </a>
          </nav>
        </div>
      </article>
    </main>
  `.trim();

  return renderLayout({
    title: `${statusCode} - System Error`,
    description: 'An unexpected runtime exception occurred.',
    pathname,
    siteName,
    content,
  });
}

/**
 * Escapes HTML characters for output string safety
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}