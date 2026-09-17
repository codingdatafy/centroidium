/**
 * Custom Native Zero-Dependency CommonMark-compliant Markdown Parser
 * Standard independent core for Markdown conversion to HTML
 */

export interface MarkdatafyOptions {
  sanitize?: boolean;
}

export function markdatafy(markdown: string, _options: MarkdatafyOptions = {}): string {
  if (!markdown) return '';

  // Standardize line endings and sanitize raw input
  let src = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Preserve Code Blocks first (Fenced code blocks) to prevent inner markup parsing
  const codeBlocks: string[] = [];
  src = src.replace(/^```([a-zA-Z0-9_-]*)\n([\s\S]*?)\n^```/gm, (_match, lang, code) => {
    const escapedCode = escapeHtml(code);
    const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code${langClass}>${escapedCode}</code></pre>`);
    return placeholder;
  });

  // Preserve Inline Code
  const inlineCodes: string[] = [];
  src = src.replace(/`([^`]+)`/g, (_match, code) => {
    const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return placeholder;
  });

  // Process Headings (# h1 to ###### h6)
  src = src.replace(/^(#{1,6})\s+(.+)$/gm, (_match, hashes, title) => {
    const level = hashes.length;
    const text = title.trim();
    const id = slugify(text);
    return `<h${level} id="${id}">${parseInline(text)}</h${level}>`;
  });

  // Process Horizontal Rules
  src = src.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr />');

  // Process Blockquotes
  src = src.replace(/^>\s+(.+)$/gm, (_match, quote) => {
    return `<blockquote><p>${parseInline(quote.trim())}</p></blockquote>`;
  });

  // Process Unordered Lists
  src = src.replace(/^(?:[*+-])\s+(.+)$/gm, '<ul><li>$1</li></ul>');
  src = src.replace(/<\/ul>\n<ul>/g, '');

  // Process Ordered Lists
  src = src.replace(/^\d+\.\s+(.+)$/gm, '<ol><li>$1</li></ol>');
  src = src.replace(/<\/ol>\n<ol>/g, '');

  // Wrap remaining text blocks into Paragraphs
  const blocks = src.split(/\n\n+/);
  const parsedBlocks = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<hr') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('__CODE_BLOCK_')
    ) {
      return trimmed;
    }
    return `<p>${parseInline(trimmed.replace(/\n/g, ' '))}</p>`;
  });

  let html = parsedBlocks.join('\n');

  // Restore Code Blocks
  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block);
  });

  // Restore Inline Code
  inlineCodes.forEach((code, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, code);
  });

  return html;
}

/**
 * Inline elements parser (Links, Images, Bold, Italic)
 */
function parseInline(text: string): string {
  let out = text;

  // Images: ![alt](url)
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  });

  // Links: [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    return `<a href="${escapeHtml(href)}">${parseInline(label)}</a>`;
  });

  // Bold: **text** or __text__
  out = out.replace(/(?:\*\*|__)(.*?)(?:\*\*|__)/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  out = out.replace(/(?:\*|_)(.*?)(?:\*|_)/g, '<em>$1</em>');

  return out;
}

/**
 * Escapes HTML entities to protect against XSS injections
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts heading titles into URL-safe HTML anchors/slugs
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // remove existing HTML tags
    .replace(/[^\w\s-]/g, '') // remove special characters
    .trim()
    .replace(/\s+/g, '-');
}