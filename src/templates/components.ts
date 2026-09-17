export interface HeaderProps {
  currentPath: string;
}

export interface FooterProps {
  siteName: string;
}

export interface MetaProps {
  title: string;
  description: string;
  canonicalUrl: string;
  siteName: string;
}

/**
 * Renders HTML head metadata including OpenGraph and JSON-LD structured data
 */
export function renderMeta({ title, description, canonicalUrl, siteName }: MetaProps): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": siteName,
    "url": "https://www.codingdatafy.com",
    "logo": "https://www.codingdatafy.com/images/logo.png",
    "sameAs": [
      "https://github.com/codingdatafy",
      "https://x.com/codingdatafy",
      "https://facebook.com/codingdatafy"
    ]
  };

  return `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <link rel="icon" type="image/png" href="/images/favicon.png" />
    
    <!-- Open Graph Metadata -->
    <meta property="og:site_name" content="${escapeHtml(siteName)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="https://www.codingdatafy.com/images/logo.png" />

    <!-- Twitter Card Metadata -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="https://www.codingdatafy.com/images/logo.png" />

    <!-- Stylesheet -->
    <link rel="stylesheet" href="/styles/centroidium.css" />

    <!-- Structured Data (JSON-LD) -->
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `.trim();
}

/**
 * Renders header and navigation component with active route highlighting
 */
export function renderHeader({ currentPath }: HeaderProps): string {
  const navItems = [
    { label: 'Homepage', path: '/' },
    { label: 'Languages', path: '/languages' },
    { label: 'Frameworks', path: '/frameworks' },
    { label: 'APIs', path: '/apis' },
    { label: 'Protocols', path: '/protocols' },
    { label: 'Databases', path: '/databases' },
    { label: 'Tools', path: '/tools' },
    { label: 'Compatibility', path: '/compatibility' },
    { label: 'Development', path: '/development' },
    { label: 'Roadmaps', path: '/roadmaps' },
    { label: 'Glossary', path: '/glossary' },
  ];

  const navList = navItems
    .map((item) => {
      const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
      const activeAttr = isActive ? ' class="active" aria-current="page"' : '';
      return `<li><a href="${item.path}"${activeAttr}>${item.label}</a></li>`;
    })
    .join('\n              ');

  return `
    <header id="header">
      <a href="/" id="logo">
        <img src="/images/logo.png" alt="CodingDatafy Logo" width="368" height="77" />
      </a>
      <nav id="navigation">
        <ul>
          ${navList}
        </ul>
      </nav>
    </header>
  `.trim();
}

/**
 * Renders global footer component
 */
export function renderFooter({ siteName }: FooterProps): string {
  return `
    <footer id="footer">
      <ul id="footer-links">
        <li><a href="/about">About</a></li>
        <li><a href="/terms-of-use">Terms of Use</a></li>
        <li><a href="/privacy-policy">Privacy Policy</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/faq">FAQ</a></li>
        <li><a href="/contribute">Contribute</a></li>
        <li><a href="/sponsors">Sponsors</a></li>
      </ul>          
      <ul id="social-networks">
        <li>
          <a href="https://github.com/codingdatafy" target="_blank" rel="external noopener noreferrer">
            <img src="/images/github.png" alt="GitHub" width="32" height="32" loading="lazy" />
          </a>
        </li>
      </ul>
      <p id="copyright">
        <small>Copyright © 2026 <strong>${escapeHtml(siteName)}™</strong> Organization | Content licensed under <strong>CC BY-SA 4.0</strong></small>
      </p>
    </footer>
  `.trim();
}

/**
 * Utility HTML entity escaper
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}