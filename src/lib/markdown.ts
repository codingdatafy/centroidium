import type { ProcessedDocument, DocumentMeta } from '../types';
import { markdatafy } from './markdatafy';

/**
 * Safe HTML Tag Allowlist against XSS
 */
const ALLOWED_TAGS = new Set([
  'div', 'span', 'h2', 'h3', 'h4', 'p', 'a', 'dfn', 'abbr', 
  'em', 'strong', 'mark', 'time', 'ul', 'ol', 'li',
  'dt', 'dd', 'dl', 'table', 'caption', 'colgroup', 'col',
  'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'img', 'blockquote',
  'pre', 'code', 'hr', 'br', 'sub', 'sup', 'small', 'kbd'
]);

/**
 * Global HTML Attributes allowed on any tag in ALLOWED_TAGS
 */
const GLOBAL_ALLOWED_ATTRIBUTES = new Set([
  'class', 'id', 'title', 'lang', 'dir', 'role', 'hidden', 'tabindex'
]);

/**
 * Tag-Specific Attribute Allowlist
 */
const TAG_SPECIFIC_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'download']),
  time: new Set(['datetime']),
  img: new Set(['alt', 'src', 'width', 'height', 'loading', 'decoding']),
  col: new Set(['span']),
  colgroup: new Set(['span']),
  td: new Set(['colspan', 'rowspan', 'headers']),
  th: new Set(['colspan', 'rowspan', 'headers', 'scope']),
  ol: new Set(['start', 'reversed', 'type']),
};

/**
 * Processor for Site Markdown content:
 * Extracts frontmatter metadata, converts markdown body, sanitizes raw HTML,
 * and wraps H2-H4 sections cleanly.
 */
export async function processMarkdown(rawMarkdown: string): Promise<ProcessedDocument> {
  const { meta, body } = parseFrontmatter(rawMarkdown);
  
  const rawHtml = markdatafy(body);

  const sanitizedHtml = sanitizeHtml(rawHtml);

  const contentHtml = await wrapSections(sanitizedHtml);

  return {
    meta,
    contentHtml,
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
        if (inSection) {
          element.before('</section>', { html: true });
        }
        
        const id = element.getAttribute('id') || '';
        const sectionId = id ? ` id="section-${id}"` : '';
        element.before(`<section class="doc-section"${sectionId}>`, { html: true });
        inSection = true;
      }
    });

  const response = rewriter.transform(new Response(html));
  transformedHtml = await response.text();

  if (inSection) {
    transformedHtml += '</section>';
  }

  return transformedHtml;
}

/**
 * Validates whether an attribute name is safe to allow
 */
function isAllowedAttribute(tag: string, attrName: string): boolean {
  if (GLOBAL_ALLOWED_ATTRIBUTES.has(attrName)) {
    return true;
  }

  if (attrName.startsWith('aria-') || attrName.startsWith('data-')) {
    return true;
  }

  const tagAttrs = TAG_SPECIFIC_ATTRIBUTES[tag];
  return tagAttrs ? tagAttrs.has(attrName) : false;
}

/**
 * Strips script tags, unsafe protocols (javascript:), and non-allowlisted tags/attributes.
 */
function sanitizeHtml(html: string): string {
  // 1. Decode entities if markdatafy pre-escapes raw tags like &lt;dl&gt;
  let clean = html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // 2. Strip dangerous tag blocks completely
  clean = clean.replace(/<(script|iframe|object|embed|style|form|input|button|select|textarea)[^>]*>[\s\S]*?<\/\1>/gi, '');

  // 3. Strip inline JavaScript event handlers (e.g. onclick=..., onload=...)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // 4. Strip unsafe URI protocols in href and src
  clean = clean.replace(/(href|src)\s*=\s*["']?\s*(?:javascript|vbscript|data):[^"'>\s]+/gi, '$1="#"');

  // 5. Filter allowed tags and allowed attributes
  clean = clean.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, tagName, attrString) => {
    const tag = tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      return '';
    }

    if (match.startsWith('</')) {
      return `</${tag}>`;
    }

    const cleanAttrs: string[] = [];
    const attrRegex = /([a-z0-9-.]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/gi;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      const attrName = attrMatch[1]?.toLowerCase();
      if (!attrName) continue;

      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      if (isAllowedAttribute(tag, attrName)) {
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}