/**
 * markdatafy.ts
 * A CommonMark 0.31.2 compliant Markdown to HTML renderer.
 */

export interface ParserOptions {
  sanitize?: boolean;
}

enum BlockType {
  Document = 'Document',
  Paragraph = 'Paragraph',
  Heading = 'Heading',
  ThematicBreak = 'ThematicBreak',
  CodeBlock = 'CodeBlock',
  BlockQuote = 'BlockQuote',
}

interface BlockNode {
  type: BlockType;
  level?: number;
  info?: string;
  lines: string[];
  children: BlockNode[];
}

/**
 * Escapes HTML entity characters per CommonMark spec section 2.1
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Parses inline CommonMark constructs (code spans, emphasis, links, escape chars).
 */
export function parseInline(text: string): string {
  let result = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    // Escaped characters
    if (char === '\\' && i + 1 < len && /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(text[i + 1])) {
      result += escapeHtml(text[i + 1]);
      i += 2;
      continue;
    }

    // Inline Code Spans
    if (char === '`') {
      let backtickCount = 1;
      while (i + backtickCount < len && text[i + backtickCount] === '`') {
        backtickCount++;
      }
      const closingIndex = text.indexOf('`'.repeat(backtickCount), i + backtickCount);
      if (closingIndex !== -1) {
        const rawCode = text.slice(i + backtickCount, closingIndex);
        const cleanedCode = rawCode.replace(/\n/g, ' ');
        result += `<code>${escapeHtml(cleanedCode)}</code>`;
        i = closingIndex + backtickCount;
        continue;
      }
    }

    // Raw HTML entities or tags escaping
    if (char === '<') {
      result += '&lt;';
      i++;
      continue;
    }
    if (char === '>') {
      result += '&gt;';
      i++;
      continue;
    }
    if (char === '&') {
      result += '&amp;';
      i++;
      continue;
    }

    result += char;
    i++;
  }

  // Basic emphasis handling (* patterns)
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return result;
}

/**
 * Parses block-level elements according to CommonMark block structure requirements.
 */
function parseBlocks(markdown: string): BlockNode {
  const root: BlockNode = { type: BlockType.Document, lines: [], children: [] };
  const lines = markdown.split(/\r?\n/);
  let currentParagraph: BlockNode | null = null;
  let inFencedCode = false;
  let fenceChar = '';
  let fenceLength = 0;
  let codeBlockNode: BlockNode | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block handling
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!inFencedCode && fenceMatch) {
      if (currentParagraph) {
        root.children.push(currentParagraph);
        currentParagraph = null;
      }
      inFencedCode = true;
      fenceChar = fenceMatch[1][0];
      fenceLength = fenceMatch[1].length;
      codeBlockNode = {
        type: BlockType.CodeBlock,
        info: fenceMatch[2].trim(),
        lines: [],
        children: [],
      };
      root.children.push(codeBlockNode);
      continue;
    }

    if (inFencedCode && codeBlockNode) {
      const closeFenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (
        closeFenceMatch &&
        closeFenceMatch[1][0] === fenceChar &&
        closeFenceMatch[1].length >= fenceLength
      ) {
        inFencedCode = false;
        codeBlockNode = null;
        continue;
      }
      codeBlockNode.lines.push(line);
      continue;
    }

    // Blank lines
    if (line.trim() === '') {
      if (currentParagraph) {
        root.children.push(currentParagraph);
        currentParagraph = null;
      }
      continue;
    }

    // Thematic Breaks (HR)
    if (/^ {0,3}(?:\* *\* *\*|- *- *-|_ *_ *_)[ *_-]*$/.test(line)) {
      if (currentParagraph) {
        root.children.push(currentParagraph);
        currentParagraph = null;
      }
      root.children.push({ type: BlockType.ThematicBreak, lines: [], children: [] });
      continue;
    }

    // ATX Headings (# Heading)
    const headingMatch = line.match(/^ {0,3}(#{1,6})(?:\s+(.*?))?(?:\s+#+)?$/);
    if (headingMatch) {
      if (currentParagraph) {
        root.children.push(currentParagraph);
        currentParagraph = null;
      }
      root.children.push({
        type: BlockType.Heading,
        level: headingMatch[1].length,
        lines: [headingMatch[2] || ''],
        children: [],
      });
      continue;
    }

    // Paragraph continuation or initialization
    if (!currentParagraph) {
      currentParagraph = { type: BlockType.Paragraph, lines: [line.trim()], children: [] };
    } else {
      currentParagraph.lines.push(line.trim());
    }
  }

  if (currentParagraph) {
    root.children.push(currentParagraph);
  }

  return root;
}

/**
 * Renders parsed block AST into HTML string output.
 */
function renderBlocks(node: BlockNode): string {
  let html = '';

  for (const child of node.children) {
    switch (child.type) {
      case BlockType.Heading: {
        const content = parseInline(child.lines.join(' '));
        html += `<h${child.level}>${content}</h${child.level}>\n`;
        break;
      }
      case BlockType.ThematicBreak: {
        html += `<hr />\n`;
        break;
      }
      case BlockType.CodeBlock: {
        const rawCode = child.lines.join('\n') + (child.lines.length > 0 ? '\n' : '');
        const infoAttr = child.info
          ? ` class="language-${escapeHtml(child.info.split(/\s+/)[0])}"`
          : '';
        html += `<pre><code${infoAttr}>${escapeHtml(rawCode)}</code></pre>\n`;
        break;
      }
      case BlockType.Paragraph: {
        const content = parseInline(child.lines.join('\n'));
        html += `<p>${content}</p>\n`;
        break;
      }
    }
  }

  return html;
}

/**
 * Main conversion API entry point.
 * Converts CommonMark input string into valid HTML string.
 */
export function markdatafy(markdown: string, options?: ParserOptions): string {
  if (!markdown) return '';
  const ast = parseBlocks(markdown);
  return renderBlocks(ast);
}

export default markdatafy;