/**
 * markdatafy.ts - CommonMark (v0.31.2) Parser Core
 * Architecture: Two-Phase AST Scanner (Block AST Construction -> Inline Tokenization)
 */

export interface MarkdatafyOptions {
  sanitize?: boolean;
}

// AST Block Node Types
type BlockType =
  | 'document'
  | 'paragraph'
  | 'heading'
  | 'code_block'
  | 'blockquote'
  | 'list'
  | 'list_item'
  | 'thematic_break'
  | 'html_block';

interface BlockNode {
  type: BlockType;
  level?: number; // Heading level (1-6)
  info?: string; // Code block language info
  fenced?: boolean; // Fenced vs indented code block
  fenceChar?: string;
  fenceLen?: number;
  ordered?: boolean; // List type
  start?: number; // List start index
  tight?: boolean; // List tight/loose status
  isOpen: boolean;
  children: BlockNode[];
  lines: string[];
  parent: BlockNode | null;
}

// Inline AST Token Types
interface InlineToken {
  type: string;
  text?: string;
  href?: string;
  title?: string;
  alt?: string;
  level?: number;
  children?: InlineToken[];
}

interface Delimiter {
  char: string;
  count: number;
  canOpen: boolean;
  canClose: boolean;
  nodeIndex: number;
}

export function markdatafy(markdown: string, options: MarkdatafyOptions = {}): string {
  if (!markdown) return '';

  // Step 0: Normalize line endings & expand tabs (spec section 2.1)
  const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  // Step 1: Link Reference Definition Pre-pass & Collection
  const refDefs: Record<string, { href: string; title: string }> = {};
  const cleanedLines = collectLinkReferences(lines, refDefs);

  // Step 2: Phase 1 - Block AST Construction
  const doc = parseBlocks(cleanedLines);

  // Step 3: Phase 2 - Render AST to HTML
  return renderBlock(doc, refDefs, options);
}

// ==========================================
// PHASE 1: BLOCK STRUCTURE PARSER
// ==========================================

function createNode(type: BlockType, parent: BlockNode | null = null): BlockNode {
  return {
    type,
    isOpen: true,
    children: [],
    lines: [],
    parent
  };
}

function parseBlocks(lines: string[]): BlockNode {
  const root = createNode('document');

  for (const rawLine of lines) {
    const line = expandTabs(rawLine);
    let current: BlockNode = getDeepestOpenBlock(root);

    // ATX Heading (# h1)
    const atxMatch = line.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*))?$/);
    if (atxMatch) {
      closeUnmatchedBlocks(current, root);
      const heading = createNode('heading', root);
      heading.level = atxMatch[1].length;
      heading.lines.push((atxMatch[2] || '').replace(/[ \t]+#+[ \t]*$/, ''));
      heading.isOpen = false;
      root.children.push(heading);
      continue;
    }

    // Fenced Code Block (``` or ~~~)
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*(.*)$/);
    if (current.type === 'code_block' && current.fenced) {
      const closeFenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (
        closeFenceMatch &&
        closeFenceMatch[1][0] === current.fenceChar &&
        closeFenceMatch[1].length >= (current.fenceLen || 3)
      ) {
        current.isOpen = false;
        continue;
      }
      current.lines.push(rawLine);
      continue;
    } else if (fenceMatch) {
      closeUnmatchedBlocks(current, root);
      const codeBlock = createNode('code_block', root);
      codeBlock.fenced = true;
      codeBlock.fenceChar = fenceMatch[1][0];
      codeBlock.fenceLen = fenceMatch[1].length;
      codeBlock.info = fenceMatch[2].trim();
      root.children.push(codeBlock);
      continue;
    }

    // Thematic Break (---, ***, ___)
    if (/^ {0,3}(?:\* *){3,}$|^ {0,3}(?:- *){3,}$|^ {0,3}(?:_ *){3,}$/.test(line)) {
      closeUnmatchedBlocks(current, root);
      const hr = createNode('thematic_break', root);
      hr.isOpen = false;
      root.children.push(hr);
      continue;
    }

    // Blockquote (>)
    const bqMatch = line.match(/^ {0,3}>[ \t]?(.*)$/);
    if (bqMatch) {
      if (current.type !== 'blockquote') {
        closeUnmatchedBlocks(current, root);
        const bq = createNode('blockquote', root);
        root.children.push(bq);
        current = bq;
      }
      const para = createNode('paragraph', current);
      para.lines.push(bqMatch[1]);
      current.children.push(para);
      continue;
    }

    // Unordered / Ordered List Item (*, -, +, 1.)
    const listMatch = line.match(/^ {0,3}(?:([*+-])|(\d{1,9})[\.\)])[ \t]+(.*)$/);
    if (listMatch) {
      const isOrdered = !listMatch[1];
      const content = listMatch[3];

      let list = root.children[root.children.length - 1];
      if (!list || list.type !== 'list' || list.ordered !== isOrdered) {
        closeUnmatchedBlocks(current, root);
        list = createNode('list', root);
        list.ordered = isOrdered;
        if (isOrdered) list.start = parseInt(listMatch[2], 10);
        root.children.push(list);
      }

      const item = createNode('list_item', list);
      const para = createNode('paragraph', item);
      para.lines.push(content);
      item.children.push(para);
      list.children.push(item);
      continue;
    }

    // Indented Code Block (4 spaces)
    if (line.startsWith('    ') && current.type !== 'paragraph') {
      if (current.type !== 'code_block') {
        closeUnmatchedBlocks(current, root);
        const code = createNode('code_block', root);
        code.fenced = false;
        root.children.push(code);
        current = code;
      }
      current.lines.push(rawLine.slice(4));
      continue;
    }

    // Default: Accumulate Paragraph text or close open blocks
    if (line.trim() === '') {
      closeUnmatchedBlocks(current, root);
    } else {
      let target = current;
      if (target.type === 'document' || !target.isOpen) {
        target = createNode('paragraph', root);
        root.children.push(target);
      }
      target.lines.push(line.trim());
    }
  }

  return root;
}

function getDeepestOpenBlock(node: BlockNode): BlockNode {
  if (node.children.length > 0) {
    const last = node.children[node.children.length - 1];
    if (last.isOpen) return getDeepestOpenBlock(last);
  }
  return node;
}

function closeUnmatchedBlocks(current: BlockNode, root: BlockNode): void {
  let curr: BlockNode | null = current;
  while (curr && curr !== root) {
    curr.isOpen = false;
    curr = curr.parent;
  }
}

// ==========================================
// PHASE 2: INLINE TOKENIZER & DELIMITER STACK
// ==========================================

function parseInline(
  text: string,
  refDefs: Record<string, { href: string; title: string }>
): InlineToken[] {
  const tokens: InlineToken[] = [];
  const delimiters: Delimiter[] = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    // Escape character (\)
    if (char === '\\' && i + 1 < text.length && /[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]/.test(text[i + 1])) {
      tokens.push({ type: 'text', text: text[i + 1] });
      i += 2;
      continue;
    }

    // Inline Code (`code`)
    if (char === '`') {
      let count = 0;
      while (i + count < text.length && text[i + count] === '`') count++;
      const closeIdx = text.indexOf('`'.repeat(count), i + count);
      if (closeIdx !== -1) {
        const codeContent = text.slice(i + count, closeIdx).replace(/\n/g, ' ');
        tokens.push({ type: 'code', text: codeContent });
        i = closeIdx + count;
        continue;
      }
    }

    // Inline Images & Links ![alt](url) / [label](url)
    if (char === '!' && text[i + 1] === '[') {
      const linkEnd = parseLinkOrImage(text, i + 1, refDefs, true);
      if (linkEnd) {
        tokens.push(linkEnd.token);
        i = linkEnd.nextIdx;
        continue;
      }
    } else if (char === '[') {
      const linkEnd = parseLinkOrImage(text, i, refDefs, false);
      if (linkEnd) {
        tokens.push(linkEnd.token);
        i = linkEnd.nextIdx;
        continue;
      }
    }

    // Emphasis / Strong (* or _)
    if (char === '*' || char === '_') {
      let count = 0;
      while (i + count < text.length && text[i + count] === char) count++;
      
      const canOpen = true; // Simplified delimiter run check
      const canClose = true;

      delimiters.push({
        char,
        count,
        canOpen,
        canClose,
        nodeIndex: tokens.length
      });

      tokens.push({ type: 'text', text: char.repeat(count) });
      i += count;
      continue;
    }

    // Raw Plain Text
    let nextSpecial = text.slice(i + 1).search(/[\\`!\[*_]/);     if (nextSpecial === -1) {       tokens.push({ type: 'text', text: text.slice(i) });       break;     } else {       tokens.push({ type: 'text', text: text.slice(i, i + 1 + nextSpecial) });       i += 1 + nextSpecial;     }   }    processEmphasisDelimiters(tokens, delimiters);   return tokens; }  function processEmphasisDelimiters(tokens: InlineToken[], delimiters: Delimiter[]): void {   for (let i = 0; i < delimiters.length; i++) {     const del = delimiters[i];     if (del.canClose) {       // Look back for matching opener       for (let j = i - 1; j >= 0; j--) {         const openDel = delimiters[j];         if (openDel.char === del.char && openDel.canOpen) {           const isStrong = openDel.count >= 2 && del.count >= 2;           const tagType = isStrong ? 'strong' : 'em';           const consumeCount = isStrong ? 2 : 1;            const innerTokens = tokens.slice(openDel.nodeIndex + 1, del.nodeIndex);           const wrappedNode: InlineToken = { type: tagType, children: innerTokens };            tokens.splice(openDel.nodeIndex, del.nodeIndex - openDel.nodeIndex + 1, wrappedNode);           break;         }       }     }   } }  function parseLinkOrImage(   text: string,   startIdx: number,   refDefs: Record<string, { href: string; title: string }>,   isImage: boolean ): { token: InlineToken; nextIdx: number } \vert{} null {   const closeBracket = text.indexOf(']', startIdx);   if (closeBracket === -1) return null;    const label = text.slice(startIdx + 1, closeBracket);   let rest = text.slice(closeBracket + 1);    // Direct Inline Link: (url "title")   if (rest.startsWith('(')) {     const closeParen = rest.indexOf(')');     if (closeParen !== -1) {       const linkTarget = rest.slice(1, closeParen).trim();       const parts = linkTarget.split(/\s+"(.*)"$/);       const href = parts[0];       const title = parts[1] \vert{}\vert{} '';        const token: InlineToken = isImage         ? { type: 'image', alt: label, href, title }         : { type: 'link', href, title, children: parseInline(label, refDefs) };        return { token, nextIdx: closeBracket + 1 + closeParen + 1 };     }   }    // Reference Link: [label][ref] or [label][]   const refMatch = rest.match(/^\[([^\]]*)\]/);
  if (refMatch) {
    const refKey = (refMatch[1] || label).toLowerCase().trim();
    if (refDefs[refKey]) {
      const { href, title } = refDefs[refKey];
      const token: InlineToken = isImage
        ? { type: 'image', alt: label, href, title }
        : { type: 'link', href, title, children: parseInline(label, refDefs) };

      return { token, nextIdx: closeBracket + 1 + refMatch[0].length };
    }
  }

  return null;
}

// ==========================================
// RENDERER & HTML ESCAPING
// ==========================================

function renderBlock(
  node: BlockNode,
  refDefs: Record<string, { href: string; title: string }>,
  options: MarkdatafyOptions
): string {
  switch (node.type) {
    case 'document':
      return node.children.map((child) => renderBlock(child, refDefs, options)).join('\n');

    case 'heading': {
      const content = renderInlines(parseInline(node.lines.join(' '), refDefs));
      const id = slugify(node.lines.join(' '));
      return `<h${node.level} id="${id}">${content}</h${node.level}>`;
    }

    case 'paragraph': {
      const content = renderInlines(parseInline(node.lines.join(' '), refDefs));
      return `<p>${content}</p>`;
    }

    case 'code_block': {
      const rawCode = node.lines.join('\n');
      const escaped = escapeHtml(rawCode);
      const langClass = node.info ? ` class="language-${escapeHtml(node.info.split(/\s+/)[0])}"` : '';
      return `<pre><code${langClass}>${escaped}\n</code></pre>`;
    }

    case 'blockquote': {
      const inner = node.children.map((child) => renderBlock(child, refDefs, options)).join('\n');
      return `<blockquote>\n${inner}\n</blockquote>`;
    }

    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      const startAttr = node.ordered && node.start !== undefined && node.start !== 1 ? ` start="${node.start}"` : '';
      const items = node.children.map((child) => renderBlock(child, refDefs, options)).join('\n');
      return `<${tag}${startAttr}>\n${items}\n</${tag}>`;
    }

    case 'list_item': {
      const inner = node.children.map((child) => renderBlock(child, refDefs, options)).join('\n');
      return `<li>${inner}</li>`;
    }

    case 'thematic_break':
      return '<hr />';

    default:
      return '';
  }
}

function renderInlines(tokens: InlineToken[]): string {
  return tokens
    .map((token) => {
      switch (token.type) {
        case 'text':
          return escapeHtml(token.text || '');
        case 'code':
          return `<code>${escapeHtml(token.text || '')}</code>`;
        case 'strong':
          return `<strong>${renderInlines(token.children || [])}</strong>`;
        case 'em':
          return `<em>${renderInlines(token.children || [])}</em>`;
        case 'link': {
          const titleAttr = token.title ? ` title="${escapeHtml(token.title)}"` : '';
          return `<a href="${escapeHtml(token.href || '')}"${titleAttr}>${renderInlines(token.children || [])}</a>`;
        }
        case 'image': {
          const titleAttr = token.title ? ` title="${escapeHtml(token.title)}"` : '';
          return `<img src="${escapeHtml(token.href || '')}" alt="${escapeHtml(token.alt || '')}"${titleAttr} loading="lazy" />`;
        }
        default:
          return '';
      }
    })
    .join('');
}

// ==========================================
// UTILITIES (Tab Expansion, Escaping, Ref Collection)
// ==========================================

function collectLinkReferences(
  lines: string[],
  refDefs: Record<string, { href: string; title: string }>
): string[] {
  const remainingLines: string[] = [];
  for (const line of lines) {
    const refMatch = line.match(/^ {0,3}\[([^\]]+)\]:\s*(\S+)(?:\s+["'(](.+)["')])?\s*$/);
    if (refMatch) {
      const key = refMatch[1].toLowerCase().trim();
      if (!refDefs[key]) {
        refDefs[key] = { href: refMatch[2], title: refMatch[3] || '' };
      }
    } else {
      remainingLines.push(line);
    }
  }
  return remainingLines;
}

function expandTabs(line: string): string {
  let result = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\t') {
      const numSpaces = 4 - (result.length % 4);
      result += ' '.repeat(numSpaces);
    } else {
      result += line[i];
    }
  }
  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}