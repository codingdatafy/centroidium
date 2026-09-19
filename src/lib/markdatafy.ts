/**
 * markdatafy.ts - CommonMark (v0.31.2) Engine & AST Parser
 *
 * Architecture:
 * 1. Line Normalization & Tab Expansion (Spec §2.1 - §2.2)
 * 2. Phase 1: Block Structure AST Parsing with Continuation Stack (Spec §3 - §5)
 * 3. Link Reference Definition Harvesting (Spec §4.7)
 * 4. Phase 2: Inline Scanning & Delimiter Stack Processing (Spec §6)
 * 5. HTML AST Rendering (Spec Appendix A)
 */

export interface MarkdatafyOptions {
  sanitize?: boolean;
}

export interface LinkRef {
  href: string;
  title: string;
}

// ==========================================
// AST NODE TYPES
// ==========================================

export type BlockType =
  | 'document'
  | 'paragraph'
  | 'heading'
  | 'code_block'
  | 'blockquote'
  | 'list'
  | 'list_item'
  | 'thematic_break'
  | 'html_block';

export interface BlockNode {
  type: BlockType;
  isOpen: boolean;
  children: BlockNode[];
  lines: string[];
  parent: BlockNode | null;
  level?: number;         // Heading level (1-6)
  info?: string;          // Fenced code language info
  fenced?: boolean;       // Fenced vs Indented code block
  fenceChar?: string;
  fenceLen?: number;
  fenceIndent?: number;
  ordered?: boolean;      // List type
  start?: number;         // List start index
  bulletChar?: string;
  tight?: boolean;        // List tight vs loose status
  htmlType?: number;      // HTML block condition type (1-7)
  inlineAST?: InlineNode[];
}

export type InlineType =
  | 'text'
  | 'softbreak'
  | 'hardbreak'
  | 'code'
  | 'strong'
  | 'em'
  | 'link'
  | 'image'
  | 'raw_html';

export interface InlineNode {
  type: InlineType;
  text?: string;
  href?: string;
  title?: string;
  alt?: string;
  children?: InlineNode[];
}

interface Delimiter {
  char: string;
  count: number;
  canOpen: boolean;
  canClose: boolean;
  nodeIndex: number;
  active: boolean;
}

// ==========================================
// MAIN PARSER ENTRYPOINT
// ==========================================

export function markdatafy(markdown: string, options: MarkdatafyOptions = {}): string {
  if (!markdown) return '';

  // Step 0: Standardize line endings & replace NULL bytes (Spec §2.1 & §2.3)
  const sanitized = markdown
    .replace(/\0/g, '\uFFFD')
    .replace(/\r\n|\r/g, '\n');

  const refDefs: Record<string, LinkRef> = {};

  // Step 1: Phase 1 - Block AST Construction
  const doc = parseBlocks(sanitized.split('\n'));

  // Step 2: Extract Link Reference Definitions from Paragraphs (Spec §4.7)
  extractLinkReferences(doc, refDefs);

  // Step 3: Phase 2 - Inline Tokenization & Delimiter Matching
  processInlines(doc, refDefs);

  // Step 4: Phase 3 - Render AST to HTML
  return renderBlock(doc, options);
}

// ==========================================
// PHASE 1: BLOCK STRUCTURE PARSER
// ==========================================

function createBlockNode(type: BlockType, parent: BlockNode | null = null): BlockNode {
  return {
    type,
    isOpen: true,
    children: [],
    lines: [],
    parent
  };
}

function parseBlocks(lines: string[]): BlockNode {
  const root = createBlockNode('document');

  for (let l = 0; l < lines.length; l++) {
    let line = expandTabs(lines[l]);
    let current: BlockNode = root;

    // Determine current deepest open node
    while (current.children.length > 0 && current.children[current.children.length - 1].isOpen) {
      current = current.children[current.children.length - 1];
    }

    // Check for open Fenced Code Block termination or continuation
    if (current.type === 'code_block' && current.fenced) {
      const closeFenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (
        closeFenceMatch &&
        closeFenceMatch[1][0] === current.fenceChar &&
        closeFenceMatch[1].length >= (current.fenceLen || 3)
      ) {
        current.isOpen = false;
      } else {
        // Strip fence indent spaces if present
        let codeLine = line;
        if (current.fenceIndent && current.fenceIndent > 0) {
          let spacesToRemove = current.fenceIndent;
          while (spacesToRemove > 0 && codeLine.startsWith(' ')) {
            codeLine = codeLine.slice(1);
            spacesToRemove--;
          }
        }
        current.lines.push(codeLine);
      }
      continue;
    }

    // Check for HTML Block continuation
    if (current.type === 'html_block') {
      current.lines.push(line);
      if (
        (current.htmlType === 1 && /<\/script>|<\/style>|<\/pre>/i.test(line)) ||
        (current.htmlType === 2 && /-->/.test(line)) ||
        (current.htmlType === 3 && /\?>/.test(line)) ||
        (current.htmlType === 4 && />/.test(line)) ||
        (current.htmlType === 5 && /\]\]>/.test(line))
      ) {
        current.isOpen = false;
      } else if ((current.htmlType === 6 || current.htmlType === 7) && line.trim() === '') {
        current.isOpen = false;
      }
      continue;
    }

    // Check for Blockquote prefix continuation
    const bqMatch = line.match(/^ {0,3}>[ \t]?(.*)$/);
    if (bqMatch) {
      let bqNode = current;
      if (bqNode.type !== 'blockquote') {
        closeUnmatchedBlocks(current, root);
        bqNode = createBlockNode('blockquote', root);
        root.children.push(bqNode);
      }
      line = bqMatch[1];
      current = bqNode;
    }

    // Blank Line Handling
    if (line.trim() === '') {
      if (current.type === 'paragraph') {
        current.isOpen = false;
      }
      closeUnmatchedBlocks(current, root);
      continue;
    }

    // ATX Heading (# h1 - h6)
    const atxMatch = line.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*))?$/);
    if (atxMatch) {
      closeUnmatchedBlocks(current, root);
      const heading = createBlockNode('heading', root);
      heading.level = atxMatch[1].length;
      heading.lines.push((atxMatch[2] || '').replace(/[ \t]+#+[ \t]*$/, ''));
      heading.isOpen = false;
      root.children.push(heading);
      continue;
    }

    // Setext Heading Underline (=== or --- under an open paragraph)
    if (current.type === 'paragraph' && current.lines.length > 0) {
      const setextMatch = line.match(/^ {0,3}(=+|-+)[ \t]*$/);
      if (setextMatch) {
        current.type = 'heading';
        current.level = setextMatch[1][0] === '=' ? 1 : 2;
        current.isOpen = false;
        continue;
      }
    }

    // Fenced Code Block Start (``` or ~~~)
    const fenceMatch = line.match(/^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/);
    if (fenceMatch) {
      closeUnmatchedBlocks(current, root);
      const codeBlock = createBlockNode('code_block', root);
      codeBlock.fenced = true;
      codeBlock.fenceIndent = fenceMatch[1].length;
      codeBlock.fenceChar = fenceMatch[2][0];
      codeBlock.fenceLen = fenceMatch[2].length;
      codeBlock.info = unescapeString(fenceMatch[3].trim());
      root.children.push(codeBlock);
      continue;
    }

    // Thematic Break (---, ***, ___)
    if (/^ {0,3}(?:\* *){3,}$|^ {0,3}(?:- *){3,}$\vert{}^ {0,3}(?:_ *){3,}$/.test(line)) {
      closeUnmatchedBlocks(current, root);
      const hr = createBlockNode('thematic_break', root);
      hr.isOpen = false;
      root.children.push(hr);
      continue;
    }

    // HTML Block Start (Types 1-7)
    const htmlType = getHtmlBlockType(line);
    if (htmlType !== 0) {
      closeUnmatchedBlocks(current, root);
      const htmlBlock = createBlockNode('html_block', root);
      htmlBlock.htmlType = htmlType;
      htmlBlock.lines.push(line);
      root.children.push(htmlBlock);
      continue;
    }

    // Unordered / Ordered List Item
    const listMatch = line.match(/^ {0,3}(?:([*+-])|(\d{1,9})[\.\)])(?:[ \t]+(.*)|$)/);
    if (listMatch) {
      const isOrdered = !listMatch[1];
      const bulletChar = listMatch[1] || listMatch[2];
      const content = listMatch[3] || '';

      let list = root.children[root.children.length - 1];
      if (!list || list.type !== 'list' || list.ordered !== isOrdered) {
        closeUnmatchedBlocks(current, root);
        list = createBlockNode('list', root);
        list.ordered = isOrdered;
        if (isOrdered) list.start = parseInt(listMatch[2], 10);
        list.bulletChar = bulletChar;
        root.children.push(list);
      }

      const item = createBlockNode('list_item', list);
      const para = createBlockNode('paragraph', item);
      if (content) para.lines.push(content);
      item.children.push(para);
      list.children.push(item);
      continue;
    }

    // Indented Code Block (4 spaces)
    if (line.startsWith('    ') && current.type !== 'paragraph') {
      if (current.type !== 'code_block') {
        closeUnmatchedBlocks(current, root);
        const code = createBlockNode('code_block', root);
        code.fenced = false;
        root.children.push(code);
        current = code;
      }
      current.lines.push(line.slice(4));
      continue;
    }

    // Paragraph Line Accumulation
    let target = current;
    if (target.type === 'document' || !target.isOpen) {
      target = createBlockNode('paragraph', root);
      root.children.push(target);
    }
    target.lines.push(line.trim());
  }

  return root;
}

function closeUnmatchedBlocks(current: BlockNode, root: BlockNode): void {
  let curr: BlockNode | null = current;
  while (curr && curr !== root) {
    curr.isOpen = false;
    curr = curr.parent;
  }
}

function getHtmlBlockType(line: string): number {
  if (/^ {0,3}<(?:script|pre|style)(?:\s|>|$)/i.test(line)) return 1;
  if (/^ {0,3}<!--/.test(line)) return 2;
  if (/^ {0,3}<\?/.test(line)) return 3;
  if (/^ {0,3}<![A-Z]/.test(line)) return 4;
  if (/^ {0,3}<!\[CDATA\[/.test(line)) return 5;   if (/^ {0,3}<\/?(?:address\vert{}article\vert{}aside\vert{}base\vert{}basefont\vert{}blockquote\vert{}body\vert{}caption\vert{}center\vert{}col\vert{}colgroup\vert{}dd\vert{}details\vert{}dialog\vert{}dir\vert{}div\vert{}dl\vert{}dt\vert{}fieldset\vert{}figcaption\vert{}figure\vert{}footer\vert{}form\vert{}frame\vert{}frameset\vert{}h1\vert{}h2\vert{}h3\vert{}h4\vert{}h5\vert{}h6\vert{}head\vert{}header\vert{}hr\vert{}html\vert{}iframe\vert{}legend\vert{}li\vert{}link\vert{}main\vert{}menu\vert{}menuitem\vert{}nav\vert{}noframes\vert{}ol\vert{}optgroup\vert{}option\vert{}p\vert{}param\vert{}section\vert{}source\vert{}summary\vert{}table\vert{}tbody\vert{}td\vert{}tfoot\vert{}th\vert{}thead\vert{}title\vert{}tr\vert{}track\vert{}ul)(?:\s\vert{}\/>\vert{}>\vert{}$)/i.test(line)) return 6;   if (/^ {0,3}(?:<[a-zA-Z][a-zA-Z0-9-]*\vert{}^\s*<\/[a-zA-Z][a-zA-Z0-9-]*\s*>)/.test(line)) return 7;   return 0; }  // ========================================== // LINK REFERENCE HARVESTING (Spec §4.7) // ==========================================  function extractLinkReferences(node: BlockNode, refDefs: Record<string, LinkRef>): void {   for (let i = 0; i < node.children.length; i++) {     const child = node.children[i];     if (child.type === 'paragraph') {       const remainingLines: string[] = [];       for (const line of child.lines) {         const refMatch = line.match(/^ {0,3}\[([^\]]+)\]:\s*(\S+)(?:\s+["'(](.+)["'])?\s*$/);
        if (refMatch) {
          const labelKey = refMatch[1].toLowerCase().replace(/\s+/g, ' ').trim();
          if (!refDefs[labelKey]) {
            refDefs[labelKey] = {
              href: unescapeString(refMatch[2]),
              title: refMatch[3] ? unescapeString(refMatch[3]) : ''
            };
          }
        } else {
          remainingLines.push(line);
        }
      }
      child.lines = remainingLines;
    }
    if (child.children.length > 0) {
      extractLinkReferences(child, refDefs);
    }
  }
}

// ==========================================
// PHASE 2: INLINE TOKENIZER & DELIMITER STACK
// ==========================================

function processInlines(node: BlockNode, refDefs: Record<string, LinkRef>): void {
  if (node.type === 'paragraph' || node.type === 'heading') {
    const rawText = node.lines.join('\n');
    node.inlineAST = parseInline(rawText, refDefs);
  }
  for (const child of node.children) {
    processInlines(child, refDefs);
  }
}

function parseInline(text: string, refDefs: Record<string, LinkRef>): InlineNode[] {
  const tokens: InlineNode[] = [];
  const delimiters: Delimiter[] = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    // Soft and Hard Line Breaks
    if (char === '\n') {
      const prev = tokens[tokens.length - 1];
      if (prev && prev.type === 'text' && prev.text?.endsWith('  ')) {
        prev.text = prev.text.slice(0, -2);
        tokens.push({ type: 'hardbreak' });
      } else {
        tokens.push({ type: 'softbreak' });
      }
      i++;
      continue;
    }

    // Backslash Escapes
    if (char === '\\' && i + 1 < text.length) {
      const nextChar = text[i + 1];
      if (/[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]/.test(nextChar)) {
        tokens.push({ type: 'text', text: nextChar });
        i += 2;
        continue;
      }
      if (nextChar === '\n') {
        tokens.push({ type: 'hardbreak' });
        i += 2;
        continue;
      }
    }

    // Inline Code Spans (`code`)
    if (char === '`') {
      let count = 0;
      while (i + count < text.length && text[i + count] === '`') count++;
      const closeIdx = findMatchingBackticks(text, i + count, count);
      if (closeIdx !== -1) {
        let codeContent = text.slice(i + count, closeIdx).replace(/\n/g, ' ');
        if (codeContent.length >= 2 && codeContent.startsWith(' ') && codeContent.endsWith(' ') && codeContent.trim() !== '') {
          codeContent = codeContent.slice(1, -1);
        }
        tokens.push({ type: 'code', text: unescapeString(codeContent) });
        i = closeIdx + count;
        continue;
      }
    }

    // Inline Images & Links
    if (char === '!' && text[i + 1] === '[') {
      const parsedLink = parseLinkOrImage(text, i + 1, refDefs, true);
      if (parsedLink) {
        tokens.push(parsedLink.token);
        i = parsedLink.nextIdx;
        continue;
      }
    } else if (char === '[') {
      const parsedLink = parseLinkOrImage(text, i, refDefs, false);
      if (parsedLink) {
        tokens.push(parsedLink.token);
        i = parsedLink.nextIdx;
        continue;
      }
    }

    // Emphasis / Strong (* and _)
    if (char === '*' || char === '_') {
      let count = 0;
      while (i + count < text.length && text[i + count] === char) count++;

      const prevChar = i > 0 ? text[i - 1] : '\n';
      const nextChar = i + count < text.length ? text[i + count] : '\n';

      const flanking = getFlankingStatus(char, prevChar, nextChar);

      delimiters.push({
        char,
        count,
        canOpen: flanking.canOpen,
        canClose: flanking.canClose,
        nodeIndex: tokens.length,
        active: true
      });

      tokens.push({ type: 'text', text: char.repeat(count) });
      i += count;
      continue;
    }

    // Plain Text Ingestion Chunking
    let nextSpecial = text.slice(i + 1).search(/[\\`!\[*_|\n]/);
    if (nextSpecial === -1) {
      tokens.push({ type: 'text', text: unescapeString(text.slice(i)) });
      break;
    } else {
      tokens.push({ type: 'text', text: unescapeString(text.slice(i, i + 1 + nextSpecial)) });
      i += 1 + nextSpecial;
    }
  }

  processEmphasisDelimiters(tokens, delimiters);
  return tokens;
}

function processEmphasisDelimiters(tokens: InlineNode[], delimiters: Delimiter[]): void {
  for (let i = 0; i < delimiters.length; i++) {
    const del = delimiters[i];
    if (!del.active || !del.canClose) continue;

    for (let j = i - 1; j >= 0; j--) {
      const openDel = delimiters[j];
      if (!openDel.active || !openDel.canOpen || openDel.char !== del.char) continue;

      // Modulo 3 Rule for Emphasis vs Strong (Spec §6.2)
      if ((openDel.canClose || del.canOpen) && (openDel.count + del.count) % 3 === 0 && openDel.count % 3 !== 0 && del.count % 3 !== 0) {
        continue;
      }

      const useStrong = openDel.count >= 2 && del.count >= 2;
      const tagType = useStrong ? 'strong' : 'em';
      const consumeCount = useStrong ? 2 : 1;

      const innerTokens = tokens.slice(openDel.nodeIndex + 1, del.nodeIndex);
      const wrappedNode: InlineNode = { type: tagType, children: innerTokens };

      tokens.splice(openDel.nodeIndex, del.nodeIndex - openDel.nodeIndex + 1, wrappedNode);

      openDel.count -= consumeCount;
      del.count -= consumeCount;

      if (openDel.count === 0) openDel.active = false;
      if (del.count === 0) del.active = false;

      // Reset markers for subsequent matches
      for (let k = j + 1; k < i; k++) delimiters[k].active = false;
      break;
    }
  }
}

function getFlankingStatus(char: string, prevChar: string, nextChar: string) {
  const isUnicodeWhitespace = (c: string) => /\s/.test(c);
  const isUnicodePunctuation = (c: string) => /[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]/.test(c);

  const prevIsSpace = isUnicodeWhitespace(prevChar);
  const prevIsPunct = isUnicodePunctuation(prevChar);
  const nextIsSpace = isUnicodeWhitespace(nextChar);
  const nextIsPunct = isUnicodePunctuation(nextChar);

  const leftFlanking = !nextIsSpace && (!nextIsPunct || prevIsSpace || prevIsPunct);
  const rightFlanking = !prevIsSpace && (!prevIsPunct || nextIsSpace || nextIsPunct);

  if (char === '_') {
    return {
      canOpen: leftFlanking && (!rightFlanking || prevIsPunct),
      canClose: rightFlanking && (!leftFlanking || nextIsPunct)
    };
  } else {
    return {
      canOpen: leftFlanking,
      canClose: rightFlanking
    };
  }
}

function parseLinkOrImage(
  text: string,
  startIdx: number,
  refDefs: Record<string, LinkRef>,
  isImage: boolean
): { token: InlineNode; nextIdx: number } | null {
  const closeBracket = findMatchingBracket(text, startIdx);
  if (closeBracket === -1) return null;

  const label = text.slice(startIdx + 1, closeBracket);
  const rest = text.slice(closeBracket + 1);

  // Direct Inline Link: (url "title")
  if (rest.startsWith('(')) {
    const closeParen = rest.indexOf(')');
    if (closeParen !== -1) {
      const linkTarget = rest.slice(1, closeParen).trim();
      const parts = linkTarget.split(/\s+"(.*)"$/);
      const href = unescapeString(parts[0]);
      const title = parts[1] ? unescapeString(parts[1]) : '';

      const token: InlineNode = isImage
        ? { type: 'image', alt: label, href, title }
        : { type: 'link', href, title, children: parseInline(label, refDefs) };

      return { token, nextIdx: closeBracket + 1 + closeParen + 1 };
    }
  }

  // Indirect Reference Link: [label][ref] or [label][]
  const refMatch = rest.match(/^\[([^\]]*)\]/);
  const refKey = (refMatch ? refMatch[1] || label : label).toLowerCase().replace(/\s+/g, ' ').trim();

  if (refDefs[refKey]) {
    const { href, title } = refDefs[refKey];
    const token: InlineNode = isImage
      ? { type: 'image', alt: label, href, title }
      : { type: 'link', href, title, children: parseInline(label, refDefs) };

    const consumedLength = refMatch ? refMatch[0].length : 0;
    return { token, nextIdx: closeBracket + 1 + consumedLength };
  }

  return null;
}

// ==========================================
// RENDERER & HTML ESCAPING
// ==========================================

function renderBlock(node: BlockNode, options: MarkdatafyOptions): string {
  switch (node.type) {
    case 'document':
      return node.children.map((child) => renderBlock(child, options)).join('\n');

    case 'heading': {
      const content = renderInlines(node.inlineAST || []);
      const id = slugify(node.lines.join(' '));
      return `<h${node.level} id="${id}">${content}</h${node.level}>`;
    }

    case 'paragraph': {
      if (node.lines.length === 0) return '';
      const content = renderInlines(node.inlineAST || []);
      return `<p>${content}</p>`;
    }

    case 'code_block': {
      const rawCode = node.lines.join('\n');
      const escaped = escapeHtml(rawCode);
      const langClass = node.info ? ` class="language-${escapeHtml(node.info.split(/\s+/)[0])}"` : '';
      return `<pre><code${langClass}>${escaped}\n</code></pre>`;
    }

    case 'blockquote': {
      const inner = node.children.map((child) => renderBlock(child, options)).join('\n');
      return `<blockquote>\n${inner}\n</blockquote>`;
    }

    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      const startAttr = node.ordered && node.start !== undefined && node.start !== 1 ? ` start="${node.start}"` : '';
      const items = node.children.map((child) => renderBlock(child, options)).join('\n');
      return `<${tag}${startAttr}>\n${items}\n</${tag}>`;
    }

    case 'list_item': {
      const inner = node.children.map((child) => renderBlock(child, options)).join('\n');
      return `<li>${inner}</li>`;
    }

    case 'html_block':
      return node.lines.join('\n');

    case 'thematic_break':
      return '<hr />';

    default:
      return '';
  }
}

function renderInlines(tokens: InlineNode[]): string {
  return tokens
    .map((token) => {
      switch (token.type) {
        case 'text':
          return escapeHtml(token.text || '');
        case 'softbreak':
          return '\n';
        case 'hardbreak':
          return '<br />\n';
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
          return `<img src="${escapeHtml(token.href || '')}" alt="${escapeHtml(token.alt \vert{}\vert{} '')}"${titleAttr} />`;
        }
        case 'raw_html':
          return token.text || '';
        default:
          return '';
      }
    })
    .join('');
}

// ==========================================
// SPEC HELPER UTILITIES
// ==========================================

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

function findMatchingBackticks(text: string, startIdx: number, count: number): number {
  const needle = '`'.repeat(count);
  let idx = startIdx;
  while (idx < text.length) {
    const found = text.indexOf(needle, idx);
    if (found === -1) return -1;
    let endCount = 0;
    while (found + endCount < text.length && text[found + endCount] === '`') endCount++;
    if (endCount === count) return found;
    idx = found + endCount;
  }
  return -1;
}

function findMatchingBracket(text: string, startIdx: number): number {
  let depth = 0;
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === '\\') {
      i++;
      continue;
    }
    if (text[i] === '[') depth++;
    if (text[i] === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function unescapeString(str: string): string {
  return str.replace(/\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])/g, '$1');
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