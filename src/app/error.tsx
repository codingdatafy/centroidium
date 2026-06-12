/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

'use client';

import { useEffect, startTransition } from 'react';
import Link from 'next/link';

/**
 * GLOBAL ERROR BOUNDARY PROPERTIES
 */
interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("CodingDatafy Runtime Error:", error);
  }, [error]);

  const handleReset = () => {
    startTransition(() => {
      reset();
    });
  };

  return (
    <main className="main-error">
      <article className="article-error">
        <header className="header-error">
          <h1 className="title-error">System Exception</h1>
          <h2>An unexpected runtime error occurred</h2>
        </header>

        <div>
          <p>We apologize, but an unexpected error occurred while processing this request.</p>
          
          {error.digest && (
            <p>
              Diagnostic ID: <code>{error.digest}</code>
            </p>
          )}
          
          <nav>
            <button
              onClick={handleReset}
              aria-label="Attempt to recover from error"
            >
              Try again
            </button>
            
            <span> or </span>
            
            <Link href="/">
              Return Home
            </Link>
          </nav>
        </div>
      </article>
    </main>
  );
}