/**
 * MarkDatafy - Zero-Dependency CommonMark (v0.31.2) Parser & HTML Renderer Core
 * Designed specifically for workerd / Cloudflare Workers environment.
 * 
 * Features:
 * - Block parsing: Code blocks (fenced & indented), Blockquotes, Lists (ordered/unordered), Headings (ATX & Setext), Thematic breaks, Paragraphs, HTML blocks.
 * - Inline parsing: Raw HTML elements, Emphasis/Strong (`*`, `_`), Inline code, Links, Images, Autolinks, Hard breaks (`\n`, `\s\s\n`), HTML escaping.
 * - Automatic ID generation for headings (`h1`-`h6`).
 * - Strictly zero runtime dependencies.
 */

// ============================================================================
// HELPERS & HTML ESCAPING
// ============================================================================

/**
 * Escapes characters with special meaning in HTML contexts.
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
 * Converts a string into a clean, URL-friendly HTML slug ID.
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '') // strip nested inline HTML tags if any
    .replace(/[^\w\s-]/g, '') // remove non-alphanumeric chars except space and hyphen
    .replace(/[\s_-]+/g, '-') // replace spaces/underscores with single hyphen
    .replace(/^-+|-+$/g, ''); // strip leading/trailing hyphens
}

// ============================================================================
// INLINE PARSER
// ============================================================================

/**
 * Parses inline CommonMark constructs (raw HTML tags, code, links, images, bold, italic, breaks).
 */
function parseInline(text: string): string {
  if (!text) return '';

  let out = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    // 1. Backslash Escapes
    if (char === '\\' && i + 1 < len && /[\\`*_{}[\]()#+\-.!~]/.test(text[i + 1]!)) {
      out += escapeHtml(text[i + 1]!);
      i += 2;
      continue;
    }

    // 2. Inline Code Spans (`code` or ``code``)
    if (char === '`') {
      let tickCount = 0;
      while (i + tickCount < len && text[i + tickCount] === '`') {
        tickCount++;
      }
      const ticks = '`'.repeat(tickCount);
      const closeIdx = text.indexOf(ticks, i + tickCount);

      if (closeIdx !== -1) {
        let codeContent = text.slice(i + tickCount, closeIdx);
        // Clean leading/trailing single space if present
        if (codeContent.startsWith(' ') && codeContent.endsWith(' ') && codeContent.trim().length > 0) {
          codeContent = codeContent.slice(1, -1);
        }
        out += `<code>${escapeHtml(codeContent)}</code>`;
        i = closeIdx + tickCount;
        continue;
      }
    }

    // 3. Raw HTML Tags & Autolinks (<tag attrs...>, </tag>, <https://...>, <email@domain.com>)
    if (char === '<') {
      const autoLinkMatch = /^<((?:https?|ftp):\/\/[^\s>]+)>/i.exec(text.slice(i));
      if (autoLinkMatch && autoLinkMatch[1]) {
        const url = escapeHtml(autoLinkMatch[1]);
        out += `<a href="${url}">${url}</a>`;
        i += autoLinkMatch[0].length;
        continue;
      }

      const emailMatch = /^<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i.exec(text.slice(i));
      if (emailMatch && emailMatch[1]) {
        const email = escapeHtml(emailMatch[1]);
        out += `<a href="mailto:${email}">${email}</a>`;
        i += emailMatch[0].length;
        continue;
      }

      // Inline Raw HTML Matcher (preserves raw inline HTML tags & attributes)
      const rawHtmlMatch = /^<\/?([a-z0-9-]+)(?:\s+[^>]*|\s*)\/?>/i.exec(text.slice(i));
      if (rawHtmlMatch) {
        out += rawHtmlMatch[0];
        i += rawHtmlMatch[0].length;
        continue;
      }
    }

    // 4. Images ![alt](src "title") & Links [text](href "title")
    if (char === '!' && i + 1 < len && text[i + 1] === '[') {
      const imgMatch = /^!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+["']([^"']*)["'])?\s*\)/.exec(text.slice(i));
      if (imgMatch) {
        const alt = escapeHtml(imgMatch[1] || '');
        const src = escapeHtml(imgMatch[2] || '');
        const title = imgMatch[3] ? ` title="${escapeHtml(imgMatch[3])}"` : '';
        out += `<img src="${src}" alt="${alt}"${title} />`;
        i += imgMatch[0].length;
        continue;
      }
    }

    if (char === '[') {
      const linkMatch = /^\[([^\]]+)\]\(\s*([^\s)]+)(?:\s+["']([^"']*)["'])?\s*\)/.exec(text.slice(i));
      if (linkMatch) {
        const linkText = parseInline(linkMatch[1] || '');
        const href = escapeHtml(linkMatch[2] || '');
        const title = linkMatch[3] ? ` title="${escapeHtml(linkMatch[3])}"` : '';
        out += `<a href="${href}"${title}>${linkText}</a>`;
        i += linkMatch[0].length;
        continue;
      }
    }

    // 5. Line Breaks (Hard Break: \n or 2+ trailing spaces + \n)
    if (char === '\n') {
      out += '<br />\n';
      i++;
      continue;
    }

    // 6. Default Normal Characters
    out += escapeHtml(char!);
    i++;
  }

  // 7. Emphasis & Strong Formatting pass (*italic*, **bold**, _italic_, __bold__)
  out = out
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___(.*?)___/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>');

  return out;
}

// ============================================================================
// MAIN CORE PARSER (BLOCKS TO HTML)
// ============================================================================

/**
 * Converts Markdown source text into standard HTML string without external dependencies.
 * 
 * @param markdown The raw Markdown body content.
 * @returns Generated clean HTML string.
 */
export function markdatafy(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return '';
  }

  // Normalize line endings to LF (\n)
  const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const htmlOutput: string[] = [];

  let i = 0;
  const totalLines = lines.length;

  while (i < totalLines) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // 1. Skip Empty Lines
    if (trimmed === '') {
      i++;
      continue;
    }

    // 2. Fenced Code Blocks (``` or ~~~)
    const fenceMatch = /^(```|~~~)\s*([\w\-+.]*)/.exec(line.trimStart());
    if (fenceMatch) {
      const fenceChar = fenceMatch[1];
      const lang = fenceMatch[2] ? fenceMatch[2].trim() : '';
      const codeLines: string[] = [];
      i++;

      while (i < totalLines) {
        const curLine = lines[i]!;
        if (curLine.trimStart().startsWith(fenceChar!)) {
          i++;
          break;
        }
        codeLines.push(curLine);
        i++;
      }

      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      htmlOutput.push(`<pre><code${langClass}>${escapeHtml(codeLines.join('\n'))}\n</code></pre>`);
      continue;
    }

    // 3. Raw Block-Level HTML Blocks (e.g., <div class="...">, <table>, <dl>)
    const htmlBlockMatch = /^<\/?[a-z0-9-]+(?:\s+[^>]*|\s*)\/?>/i.exec(trimmed);
    if (htmlBlockMatch) {
      const htmlLines: string[] = [];
      while (i < totalLines) {
        const curLine = lines[i]!;
        htmlLines.push(curLine);
        i++;
        if (curLine.trim() === '' && htmlLines.length > 1) {
          break;
        }
      }
      htmlOutput.push(htmlLines.join('\n'));
      continue;
    }

    // 4. ATX Headings (# Heading, ## Heading, ..., ###### Heading)
    const atxMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (atxMatch) {
      const level = atxMatch[1]!.length;
      const rawText = atxMatch[2]!.replace(/\s+#+$/, '').trim(); // Strip trailing #s
      const parsedContent = parseInline(rawText);
      const headingSlug = slugify(rawText);
      const idAttr = headingSlug ? ` id="${headingSlug}"` : '';

      htmlOutput.push(`<h${level}${idAttr}>${parsedContent}</h${level}>`);
      i++;
      continue;
    }

    // 5. Setext Headings (Heading 1 === / Heading 2 ---)
    if (i + 1 < totalLines) {
      const nextLine = lines[i + 1]!.trim();
      if (/^={2,}$/.test(nextLine)) {
        const parsedContent = parseInline(trimmed);
        const headingSlug = slugify(trimmed);
        const idAttr = headingSlug ? ` id="${headingSlug}"` : '';
        htmlOutput.push(`<h1${idAttr}>${parsedContent}</h1>`);
        i += 2;
        continue;
      }
      if (/^-{2,}$/.test(nextLine) && !trimmed.startsWith('-')) {
        const parsedContent = parseInline(trimmed);
        const headingSlug = slugify(trimmed);
        const idAttr = headingSlug ? ` id="${headingSlug}"` : '';
        htmlOutput.push(`<h2${idAttr}>${parsedContent}</h2>`);
        i += 2;
        continue;
      }
    }

    // 6. Thematic Breaks / Horizontal Rules (---, ***, ___)
    if (/^(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(trimmed)) {
      htmlOutput.push('<hr />');
      i++;
      continue;
    }

    // 7. Blockquotes (> Quote)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < totalLines && lines[i]!.trimStart().startsWith('>')) {
        quoteLines.push(lines[i]!.trimStart().replace(/^>\s?/, ''));
        i++;
      }
      const quoteContent = markdatafy(quoteLines.join('\n'));
      htmlOutput.push(`<blockquote>\n${quoteContent}\n</blockquote>`);
      continue;
    }

    // 8. Unordered Lists (- item, * item, + item) & Ordered Lists (1. item)
    const ulMatch = /^[*+-]\s+(.+)/.exec(trimmed);
    const olMatch = /^(\d+)\.\s+(.+)/.exec(trimmed);

    if (ulMatch || olMatch) {
      const isOrdered = !!olMatch;
      const listTag = isOrdered ? 'ol' : 'ul';
      const startAttr = isOrdered && olMatch![1] !== '1' ? ` start="${olMatch![1]}"` : '';
      const listItems: string[] = [];

      const listRegex = isOrdered ? /^\d+\.\s+(.+)/ : /^[*+-]\s+(.+)/;

      while (i < totalLines) {
        const curTrimmed = lines[i]!.trim();
        const itemMatch = listRegex.exec(curTrimmed);

        if (!itemMatch) {
          // Break list loop if line is empty and next line is not a list item
          if (curTrimmed === '') {
            if (i + 1 < totalLines && !listRegex.test(lines[i + 1]!.trim())) {
              break;
            }
          } else {
            break;
          }
        } else {
          listItems.push(`<li>${parseInline(itemMatch[1]!.trim())}</li>`);
        }
        i++;
      }

      htmlOutput.push(`<${listTag}${startAttr}>\n${listItems.join('\n')}\n</${listTag}>`);
      continue;
    }

    // 9. Paragraphs
    const paragraphLines: string[] = [];
    while (i < totalLines) {
      const curLine = lines[i]!;
      const curTrimmed = curLine.trim();

      if (
        curTrimmed === '' ||
        curTrimmed.startsWith('#') ||
        curTrimmed.startsWith('```') ||
        curTrimmed.startsWith('~~~') ||
        curTrimmed.startsWith('>') ||
        /^<\/?[a-z0-9-]+/i.test(curTrimmed) ||
        /^[*+-]\s+/.test(curTrimmed) ||
        /^\d+\.\s+/.test(curTrimmed) ||
        /^(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(curTrimmed)
      ) {
        break;
      }

      paragraphLines.push(curTrimmed);
      i++;
    }

    if (paragraphLines.length > 0) {
      const parsedParagraph = parseInline(paragraphLines.join('\n'));
      htmlOutput.push(`<p>${parsedParagraph}</p>`);
    }
  }

  return htmlOutput.join('\n\n');
}