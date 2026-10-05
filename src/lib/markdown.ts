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

interface TocItem {
  id: string;
  text: string;
  children: TocItem[];
}

/**
 * Processor for Site Markdown content:
 * Extracts frontmatter metadata, converts markdown body, sanitizes raw HTML,
 * generates table of contents, and wraps H2-H4 sections cleanly in <section> tags.
 */
export async function processMarkdown(rawMarkdown: string): Promise<ProcessedDocument> {
  const { meta, body } = parseFrontmatter(rawMarkdown);
  
  const rawHtml = markdatafy(body);

  const sanitizedHtml = sanitizeHtml(rawHtml);

  const tocHtml = generateTocHtml(sanitizedHtml);

  const contentHtml = await wrapSections(sanitizedHtml);

  return {
    meta,
    contentHtml,
    tocHtml,
    rawMarkdown,
  };
}

/**
 * Generates Table of Contents HTML structure (<aside id="article-toc">) from H2 and H3 headings
 */
export function generateTocHtml(html: string): string {
  const headingRegex = /<(h[23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h[23]>/gi;
  const items: TocItem[] = [];
  let currentH2: TocItem | null = null;

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null) {
    const tag = match[1]?.toLowerCase();
    const id = match[2] || '';
    const text = (match[3] || '').replace(/<[^>]*>/g, '').trim();

    if (!id || !text) continue;

    if (tag === 'h2') {
      currentH2 = { id, text, children: [] };
      items.push(currentH2);
    } else if (tag === 'h3') {
      const h3Item: TocItem = { id, text, children: [] };
      if (currentH2) {
        currentH2.children.push(h3Item);
      } else {
        items.push(h3Item);
      }
    }
  }

  if (items.length === 0) {
    return '';
  }

  const listItemsHtml = items
    .map((item) => {
      let itemHtml = `\t\t\t\t\t\t<li><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a>`;
      if (item.children.length > 0) {
        const subItemsHtml = item.children
          .map(
            (child) =>
              `\t\t\t\t\t\t\t\t<li><a href="#${escapeHtml(child.id)}">${escapeHtml(child.text)}</a></li>`
          )
          .join('\n');
        itemHtml += `\n\t\t\t\t\t\t\t<ol>\n${subItemsHtml}\n\t\t\t\t\t\t\t</ol>\n\t\t\t\t\t\t`;
      }
      itemHtml += '</li>';
      return itemHtml;
    })
    .join('\n');

  return `<aside id="article-toc">\n\t\t\t\t<nav>\n\t\t\t\t\t<ol>\n${listItemsHtml}\n\t\t\t\t\t</ol>\n\t\t\t\t</nav>\n\t\t\t</aside>`;
}

/**
 * Wraps <h2> through <h4> headers and their sibling content inside pure <section> tags without classes or IDs
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
        
        element.before('<section>', { html: true });
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
 * Strips script tags, unsafe protocols (javascript:), and non-allowlisted tags/attributes
 * while preserving safe escaping inside pre and inline code blocks.
 */
function sanitizeHtml(html: string): string {
  const codeBlocks: string[] = [];
  let clean = html.replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  clean = clean
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  clean = clean.replace(/<(script|iframe|object|embed|style|form|input|button|select|textarea)[^>]*>[\s\S]*?<\/\1>/gi, '');

  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  clean = clean.replace(/(href|src)\s*=\s*["']?\s*(?:javascript|vbscript|data):[^"'>\s]+/gi, '$1="#"');

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

  clean = clean.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
    return codeBlocks[Number(index)] ?? '';
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