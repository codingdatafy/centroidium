import { ProcessedDocument, DocumentMeta, TableOfContentsItem } from '../types';
import { markdatafy } from './markdatafy';

/**
 * Safe HTML Allowlist against XSS (Zero-Dependency)
 */
const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'img', 'span', 'div', 'section', 'details', 'summary',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'kbd', 'sub', 'sup', 'mark'
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  th: new Set(['colspan', 'rowspan', 'align']),
  td: new Set(['colspan', 'rowspan', 'align']),
  code: new Set(['class']),
  pre: new Set(['class']),
  '*': new Set(['id', 'class', 'aria-label', 'aria-hidden'])
};

/**
 * Processor for Site Markdown content:
 * Extracts frontmatter metadata, converts markdown body, sanitizes raw HTML,
 * and wraps H2-H4 sections cleanly.
 */
export async function processMarkdown(rawMarkdown: string): Promise<ProcessedDocument> {
  const { meta, body } = parseFrontmatter(rawMarkdown);
  const toc = extractTableOfContents(body);
  
  // 1. Convert Markdown to raw HTML via CommonMark AST core
  const rawHtml = markdatafy(body);

  // 2. Sanitize inline/embedded HTML elements against XSS
  const sanitizedHtml = sanitizeHtml(rawHtml);

  // 3. Wrap H2-H4 titles inside <section> containers using Native Cloudflare HTMLRewriter
  const contentHtml = await wrapSections(sanitizedHtml);

  return {
    meta,
    contentHtml,
    toc,
    rawMarkdown,
  };
}

/**
 * Wraps <h2> through <h4> headers and their sibling content inside <section> tags
 * Uses native Cloudflare Workers HTMLRewriter API.
 */
async function wrapSections(html: string): Promise<string> {
  if (!html.trim()) return '';

  let transformedHtml = '';
  let inSection = false;

  const rewriter = new HTMLRewriter()
    .on('h2, h3, h4', {
      element(element) {
        // If we are already inside a section, close the previous section before starting a new one
        if (inSection) {
          element.before('</section>', { html: true });
        }
        
        const id = element.getAttribute('id') || '';
        const sectionId = id ? ` id="section-${id}"` : '';
        element.before(`<section class="doc-section"${sectionId}>`, { html: true });
        inSection = true;
      }
    });

  // Execute native stream transformation
  const response = rewriter.transform(new Response(html));
  transformedHtml = await response.text();

  // Close the final section if one was opened
  if (inSection) {
    transformedHtml += '</section>';
  }

  return transformedHtml;
}

/**
 * Strips script tags, unsafe protocols (javascript:), and unallowed tags/attributes.
 */
function sanitizeHtml(html: string): string {
  // Strip dangerous tag blocks completely
  let clean = html.replace(/<(script|iframe|object|embed|style|form|input)[^>]*>[\s\S]*?<\/\1>/gi, '');

  // Strip dangerous event handlers (e.g. onload=, onerror=, onclick=)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // Strip javascript: / vbscript: URI schemes from links and resources
  clean = clean.replace(/(href|src)\s*=\s*["']?\s*(?:javascript|vbscript|data):[^"'>\s]+/gi, '$1="#"');

  // Strip tags and attributes not in the explicit allowlist
  clean = clean.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, tagName, attrString) => {
    const tag = tagName.toLowerCase();

    // Disallow unlisted tags
    if (!ALLOWED_TAGS.has(tag)) {
      return '';
    }

    // Keep closing tags cleanly
    if (match.startsWith('</')) {
      return `</${tag}>`;
    }

    // Filter allowed attributes
    const allowedAttrs = ALLOWED_ATTRIBUTES[tag] || new Set();
    const globalAttrs = ALLOWED_ATTRIBUTES['*'];

    const cleanAttrs: string[] = [];
    const attrRegex = /([a-z0-9-.]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/gi;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      if (allowedAttrs.has(attrName) || globalAttrs.has(attrName)) {
        cleanAttrs.push(`${attrName}="${escapeHtml(attrValue)}"`);
      }
    }

    const attrsFormatted = cleanAttrs.length > 0 ? ` ${cleanAttrs.join(' ')}` : '';
    const isSelfClosing = match.endsWith('/>') ? ' /' : '';

    return `<${tag}${attrsFormatted}${isSelfClosing}>`;
  });

  return clean;
}

/**
 * YAML-like Frontmatter parser
 */
function parseFrontmatter(rawMarkdown: string): { meta: DocumentMeta; body: string } {
  const meta: DocumentMeta = {};
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?/;
  const match = rawMarkdown.match(frontmatterRegex);

  if (!match) {
    return { meta, body: rawMarkdown };
  }

  const yamlBlock = match[1] ?? '';
  const body = rawMarkdown.replace(frontmatterRegex, '');

  const lines = yamlBlock.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value: unknown = trimmed.slice(colonIndex + 1).trim();

    if (typeof value === 'string') {
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (value.startsWith('[') && value.endsWith(']')) {
        value = value
          .slice(1, -1)
          .split(',')
          .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      }
    }

    meta[key] = value;
  }

  return { meta, body };
}

/**
 * Extracts Table of Contents (h2-h4) directly from raw Markdown headings
 */
function extractTableOfContents(markdown: string): TableOfContentsItem[] {
  const toc: TableOfContentsItem[] = [];
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1]?.length ?? 2;
    const text = (match[2] ?? '').trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    toc.push({ id, text, level });
  }

  return toc;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}