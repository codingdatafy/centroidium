import { renderLayout } from './layout';

export interface NotFoundOptions {
  siteName: string;
  pathname: string;
}

/**
 * Renders the 404 Not Found error template wrapped in the global layout shell.
 */
export function renderNotFound({ siteName, pathname }: NotFoundOptions): string {
  const content = `
    <main class="main-not-found" data-is-404="true">
      <article class="article-not-found">
        <header class="header-not-found">
          <h1 class="title-not-found">404</h1>
          <h2>Page Not Found</h2>
        </header>

        <div>
          <p>
            Oops! The documentation page you are looking for doesn't exist or has been moved to a new directory.
          </p>

          <nav class="nav-not-found">
            <a href="/">
              Return to Homepage
            </a>

            <span> or </span>

            <a href="/languages">
              Explore Languages
            </a>
          </nav>
        </div>
      </article>
    </main>
  `.trim();

  return renderLayout({
    title: '404 - Page Not Found',
    description: "The requested documentation page doesn't exist on CodingDatafy.",
    pathname,
    siteName,
    content,
  });
}