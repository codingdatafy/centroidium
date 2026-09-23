/**
 * MarkDatafy - Zero-Dependency CommonMark (v0.31.2) Parser & HTML Renderer Core
 * https://spec.commonmark.org/0.31.2/
 */

// ============================================================================
// 1. TYPES & AST DEFINITIONS
// ============================================================================

export type BlockType =
  | 'document'
  | 'blockquote'
  | 'list'
  | 'item'
  | 'heading'
  | 'thematic_break'
  | 'code_block'
  | 'paragraph'
  | 'html_block';

export type InlineType =
  | 'text'
  | 'softbreak'
  | 'hardbreak'
  | 'code_span'
  | 'emphasis'
  | 'strong'
  | 'link'
  | 'image'
  | 'html_inline';

export interface ASTNode {
  type: BlockType | InlineType;
  children?: ASTNode[] | undefined;
  literal?: string | undefined;
  level?: number | undefined;
  info?: string | undefined;
  destination?: string | undefined;
  title?: string | undefined;
  listType?: ('bullet' | 'ordered') | undefined;
  listStart?: number | undefined;
  tight?: boolean | undefined;
}

export interface ParseOptions {
  sourcepos?: boolean | undefined;
}

// ============================================================================
// 2. CONSTANTS & HELPER UTILITIES
// ============================================================================

const ESCAPABLE_PUNCTUATION = new Set([
  '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
  ':', ';', '<', '=', '>', '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|', '}', '~'
]);

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'"
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/ architecture>/g, '&gt;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n|\r/g, '\n');
}

function expandTabs(line: string): string {
  let result = '';
  let col = 0;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '\t') {
      const spaces = 4 - (col % 4);
      result += ' '.repeat(spaces);
      col += spaces;
    } else {
      result += char;
      col++;
    }
  }
  return result;
}

function decodeEntities(text: string): string {
  return text.replace(/&(?:#([0-9]{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z0-9]+));/g, (match, dec, hex, named) => {
    if (dec) return String.fromCodePoint(parseInt(dec, 10));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    if (named && HTML_ENTITIES[`&${named};`]) return HTML_ENTITIES[`&${named};`];
    return match;
  });
}

// ============================================================================
// 3. INLINE PARSER
// ============================================================================

interface Delimiter {
  char: string;
  count: number;
  canOpen: boolean;
  canClose: boolean;
  nodeIndex: number;
}

export class InlineParser {
  public parse(input: string): ASTNode[] {
    const nodes: ASTNode[] = [];
    const delimiters: Delimiter[] = [];
    let i = 0;

    while (i < input.length) {
      const char = input[i]!;

      // 1. Backslash Escapes
      if (char === '\\' && i + 1 < input.length && ESCAPABLE_PUNCTUATION.has(input[i + 1]!)) {
        nodes.push({ type: 'text', literal: input[i + 1] });
        i += 2;
        continue;
      }

      // 2. Line Breaks
      if (char === '\n') {
        const lastNode = nodes[nodes.length - 1];
        if (lastNode && lastNode.type === 'text' && lastNode.literal?.endsWith('  ')) {
          lastNode.literal = lastNode.literal.replace(/  +$/, '');
          nodes.push({ type: 'hardbreak' });
        } else {
          nodes.push({ type: 'softbreak' });
        }
        i++;
        continue;
      }

      // 3. Code Spans
      if (char === '`') {
        let backtickCount = 0;
        while (i + backtickCount < input.length && input[i + backtickCount] === '`') {
          backtickCount++;
        }
        const closingIndex = this.findMatchingBackticks(input, i + backtickCount, backtickCount);
        if (closingIndex !== -1) {
          let content = input.slice(i + backtickCount, closingIndex);
          content = content.replace(/\n/g, ' ');
          if (content.length >= 2 && content.startsWith(' ') && content.endsWith(' ') && content.trim().length > 0) {
            content = content.slice(1, -1);
          }
          nodes.push({ type: 'code_span', literal: content });
          i = closingIndex + backtickCount;
          continue;
        }
      }

      // 4. Autolinks
      if (char === '<') {
        const autolinkMatch = input.slice(i).match(/^<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^<>\s]+)>/);
        if (autolinkMatch && autolinkMatch[1]) {
          nodes.push({
            type: 'link',
            destination: autolinkMatch[1],
            children: [{ type: 'text', literal: autolinkMatch[1] }]
          });
          i += autolinkMatch[0].length;
          continue;
        }
      }

      // 5. Emphasis & Strong Delimiters
      if (char === '*' || char === '_') {
        let count = 0;
        while (i + count < input.length && input[i + count] === char) {
          count++;
        }

        const prevChar = i > 0 ? input[i - 1]! : ' ';
        const nextChar = i + count < input.length ? input[i + count]! : ' ';
        const isLeftFlanking = !/\s/.test(nextChar) && (!ESCAPABLE_PUNCTUATION.has(nextChar) || /\s/.test(prevChar) || ESCAPABLE_PUNCTUATION.has(prevChar));
        const isRightFlanking = !/\s/.test(prevChar) && (!ESCAPABLE_PUNCTUATION.has(prevChar) || /\s/.test(nextChar) || ESCAPABLE_PUNCTUATION.has(nextChar));

        const nodeIndex = nodes.length;
        nodes.push({ type: 'text', literal: char.repeat(count) });

        delimiters.push({
          char,
          count,
          canOpen: char === '*' ? isLeftFlanking : isLeftFlanking && (!isRightFlanking || ESCAPABLE_PUNCTUATION.has(prevChar)),
          canClose: char === '*' ? isRightFlanking : isRightFlanking && (!isLeftFlanking || ESCAPABLE_PUNCTUATION.has(nextChar)),
          nodeIndex
        });

        i += count;
        continue;
      }

      // Text accumulation
      const lastNode = nodes[nodes.length - 1];
      if (lastNode && lastNode.type === 'text') {
        lastNode.literal = (lastNode.literal ?? '') + char;
      } else {
        nodes.push({ type: 'text', literal: char });
      }
      i++;
    }

    this.processEmphasis(nodes, delimiters);
    return nodes;
  }

  private findMatchingBackticks(input: string, start: number, count: number): number {
    let pos = start;
    while (pos < input.length) {
      const idx = input.indexOf('`', pos);
      if (idx === -1) return -1;
      let currentCount = 0;
      while (idx + currentCount < input.length && input[idx + currentCount] === '`') {
        currentCount++;
      }
      if (currentCount === count) return idx;
      pos = idx + currentCount;
    }
    return -1;
  }

  private processEmphasis(nodes: ASTNode[], delimiters: Delimiter[]): void {
    let stackBottom = 0;

    while (stackBottom < delimiters.length) {
      let closerIdx = -1;
      for (let i = stackBottom; i < delimiters.length; i++) {
        if (delimiters[i]!.canClose) {
          closerIdx = i;
          break;
        }
      }

      if (closerIdx === -1) break;

      const closer = delimiters[closerIdx]!;
      let openerIdx = -1;

      for (let i = closerIdx - 1; i >= stackBottom; i--) {
        const opener = delimiters[i]!;
        if (opener.char === closer.char && opener.canOpen) {
          openerIdx = i;
          break;
        }
      }

      if (openerIdx !== -1) {
        const opener = delimiters[openerIdx]!;
        const isStrong = opener.count >= 2 && closer.count >= 2;
        const useCount = isStrong ? 2 : 1;

        opener.count -= useCount;
        closer.count -= useCount;

        const openNode = nodes[opener.nodeIndex];
        const closeNode = nodes[closer.nodeIndex];
        if (openNode) openNode.literal = opener.char.repeat(opener.count);
        if (closeNode) closeNode.literal = closer.char.repeat(closer.count);

        const wrappedChildren = nodes.splice(opener.nodeIndex + 1, closer.nodeIndex - opener.nodeIndex - 1);
        const formatNode: ASTNode = {
          type: isStrong ? 'strong' : 'emphasis',
          children: wrappedChildren
        };

        nodes.splice(opener.nodeIndex + 1, 0, formatNode);

        for (let d = openerIdx + 1; d < delimiters.length; d++) {
          delimiters[d]!.nodeIndex -= wrappedChildren.length - 1;
        }

        if (opener.count === 0) delimiters.splice(openerIdx, 1);
        if (closer.count === 0) {
          delimiters.splice(closerIdx - (opener.count === 0 ? 1 : 0), 1);
        }
      } else {
        stackBottom = closerIdx + 1;
      }
    }
  }
}

// ============================================================================
// 4. MAIN COMMONMARK PARSER IMPLEMENTATION
// ============================================================================

export class MarkDatafyParser {
  private inlineParser = new InlineParser();

  public parse(markdown: string): ASTNode {
    const lines = normalizeLineEndings(markdown).split('\n');
    const root: ASTNode = { type: 'document', children: [] };

    let i = 0;
    while (i < lines.length) {
      const line = expandTabs(lines[i]!);

      // 1. ATX Headings
      const strictAtx = line.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[\t ]*#*[\t ]*$/);
      if (strictAtx && strictAtx[1]) {
        root.children!.push({
          type: 'heading',
          level: strictAtx[1].length,
          children: this.inlineParser.parse(strictAtx[2] || '')
        });
        i++;
        continue;
      }

      // 2. Thematic Breaks
      if (/^ {0,3}(?:\*[ \t]*){3,}$|^ {0,3}(?:-[ \t]*){3,}$|^ {0,3}(?:_[ \t]*){3,}$/.test(line)) {
        root.children!.push({ type: 'thematic_break' });
        i++;
        continue;
      }

      // 3. Fenced Code Blocks
      const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*(.*)$/);
      if (fenceMatch && fenceMatch[1]) {
        const marker = fenceMatch[1][0];
        const fenceLen = fenceMatch[1].length;
        const info = (fenceMatch[2] || '').trim();
        const codeLines: string[] = [];
        i++;

        while (i < lines.length) {
          const currentLine = lines[i]!;
          const closeMatch = currentLine.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
          if (closeMatch && closeMatch[1] && closeMatch[1][0] === marker && closeMatch[1].length >= fenceLen) {
            i++;
            break;
          }
          codeLines.push(currentLine);
          i++;
        }

        root.children!.push({
          type: 'code_block',
          info: decodeEntities(info),
          literal: codeLines.join('\n') + '\n'
        });
        continue;
      }

      // 4. Blockquotes
      if (/^ {0,3}>/.test(line)) {
        const quoteLines: string[] = [];
        while (i < lines.length && /^ {0,3}>/.test(lines[i]!)) {
          quoteLines.push(lines[i]!.replace(/^ {0,3}>[ \t]?/, ''));
          i++;
        }
        const subParser = new MarkDatafyParser();
        const subDoc = subParser.parse(quoteLines.join('\n'));
        root.children!.push({
          type: 'blockquote',
          children: subDoc.children
        });
        continue;
      }

      // 5. Blank Lines
      if (line.trim() === '') {
        i++;
        continue;
      }

      // 6. Paragraph Accumulation
      const paragraphLines: string[] = [];
      while (
        i < lines.length &&
        lines[i]!.trim() !== '' &&
        !/^ {0,3}(#{1,6}|`{3,}|~{3,}|>|(?:\*[ \t]*){3,}$\vert{}(?:\-[ \t]*){3,}$)/.test(lines[i]!)
      ) {
        paragraphLines.push(lines[i]!.trim());
        i++;
      }

      if (paragraphLines.length > 0) {
        root.children!.push({
          type: 'paragraph',
          children: this.inlineParser.parse(paragraphLines.join('\n'))
        });
      }
    }

    return root;
  }
}

// ============================================================================
// 5. HTML RENDERER
// ============================================================================

export class HTMLRenderer {
  public render(node: ASTNode): string {
    if (!node) return '';

    switch (node.type) {
      case 'document':
        return (node.children || []).map((child) => this.render(child)).join('');

      case 'paragraph':
        return `<p>${this.renderChildren(node)}</p>\n`;

      case 'heading':
        return `<h${node.level || 1}>${this.renderChildren(node)}</h${node.level || 1}>\n`;

      case 'blockquote':
        return `<blockquote>\n${this.renderChildren(node)}</blockquote>\n`;

      case 'code_block': {
        const attr = node.info ? ` class="language-${escapeHtml(node.info.split(/\s+/)[0] || '')}"` : '';
        return `<pre><code${attr}>${escapeHtml(node.literal || '')}</code></pre>\n`;
      }

      case 'thematic_break':
        return '<hr />\n';

      case 'text':
        return escapeHtml(node.literal || '');

      case 'emphasis':
        return `<em>${this.renderChildren(node)}</em>`;

      case 'strong':
        return `<strong>${this.renderChildren(node)}</strong>`;

      case 'code_span':
        return `<code>${escapeHtml(node.literal || '')}</code>`;

      case 'softbreak':
        return '\n';

      case 'hardbreak':
        return '<br />\n';

      case 'link':
        return `<a href="${escapeHtml(node.destination || '')}">${this.renderChildren(node)}</a>`;

      default:
        return this.renderChildren(node);
    }
  }

  private renderChildren(node: ASTNode): string {
    return (node.children || []).map((child) => this.render(child)).join('');
  }
}

// ============================================================================
// 6. EXPORTED API
// ============================================================================

export function markdatafy(markdown: string): string {
  const parser = new MarkDatafyParser();
  const ast = parser.parse(markdown);
  const renderer = new HTMLRenderer();
  return renderer.render(ast);
}

export function convertMfToMd(markdown: string): string {
  return markdatafy(markdown);
}

export default markdatafy;