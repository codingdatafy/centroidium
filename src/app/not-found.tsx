/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import Link from 'next/link';

/**
 * NOT FOUND COMPONENT
 */
export default function NotFound() {
  return (
    <main className="main-not-found">
      <article className="article-not-found">
        <header className="header-not-found">
          <h1 className="title-not-found">404</h1>
          <h2>Page Not Found</h2>
        </header>
        
        <div>
          <p>
            Oops! The documentation page you are looking for doesn't exist or has been moved to a new directory.
          </p>
          
          <nav className="nav-not-found">
            <Link href="/">
              Return to Homepage
            </Link>
            
            <span> or </span>
            
            <Link href="/languages">
              Explore Languages
            </Link>
          </nav>
        </div>
      </article>
    </main>
  );
}