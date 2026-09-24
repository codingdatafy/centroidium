/**
 * CommonMark v0.31.2
 */

export interface MarkdownOptions {
  sanitizeHtml?: boolean; // Set true to escape inline raw HTML
}

export class CommonMarkParser {
  private options: MarkdownOptions;

  constructor(options: MarkdownOptions = {}) {
    this.options = options;
  }

  /**
   * Main entry point to convert Markdown to HTML string
   */
  public parse(markdown: string): string {
    // Standardize line endings (\r\n -> \n)
    const normalized = markdown.replace(/\r\n?/g, "\n");
    const lines = normalized.split("\n");

    const blocks = this.parseBlocks(lines);
    return this.renderBlocks(blocks);
  }

  // ---------------------------------------------------------------------------
  // PHASE 1: BLOCK PARSING
  // ---------------------------------------------------------------------------

  private parseBlocks(lines: string[]): BlockNode[] {
    const root: BlockNode = { type: "root", children: [] };
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 1. Raw HTML Block Detection (Spec 4.6 - Type 6/7 tags & raw blocks)
      if (this.isRawHtmlBlockStart(line)) {
        const htmlLines: string[] = [];
        while (i < lines.length) {
          htmlLines.push(lines[i]);
          if (this.isRawHtmlBlockEnd(lines[i])) {
            i++;
            break;
          }
          i++;
        }
        root.children.push({
          type: "html_block",
          content: htmlLines.join("\n"),
        });
        continue;
      }

      // 2. Fenced Code Block Detection (Spec 4.5)
      const fenceMatch = line.match(/^( {0,3})(`{3,}|~{3,})\s*(.*)$/);
      if (fenceMatch) {
        const fenceChar = fenceMatch[2][0];
        const fenceLen = fenceMatch[2].length;
        const infoString = fenceMatch[3].trim();
        const codeLines: string[] = [];
        i++;

        while (i < lines.length) {
          const currentLine = lines[i];
          const closingMatch = currentLine.match(/^( {0,3})(`{3,}|~{3,})\s*$/);
          if (
            closingMatch &&
            closingMatch[2][0] === fenceChar &&
            closingMatch[2].length >= fenceLen
          ) {
            i++;
            break;
          }
          codeLines.push(currentLine);
          i++;
        }

        root.children.push({
          type: "code_block",
          info: infoString,
          content: codeLines.join("\n"),
        });
        continue;
      }

      // 3. ATX Heading Detection (Spec 4.2)
      const headingMatch = line.match(/^( {0,3})(#{1,6})(?:\s+(.*?))?(?:\s+#+)?\s*$/);
      if (headingMatch) {
        root.children.push({
          type: "heading",
          level: headingMatch[2].length,
          content: headingMatch[3] || "",
        });
        i++;
        continue;
      }

      // 4. Bullet & Ordered List Items (Spec 5.2 - 5.3)
      const listMatch = line.match(/^( {0,3})([*+-]|\d{1,9}[\.\)])\s+(.*)$/);
      if (listMatch) {
        const listItems: string[] = [];
        const marker = listMatch[2];
        const isOrdered = /^\d/.test(marker);

        while (i < lines.length) {
          const currentLine = lines[i];
          const itemMatch = currentLine.match(/^( {0,3})([*+-]|\d{1,9}[\.\)])\s+(.*)$/);
          if (itemMatch) {
            listItems.push(itemMatch[3]);
            i++;
          } else if (currentLine.trim() === "") {
            break;
          } else {
            // Continuation line
            listItems.push(currentLine.trim());
            i++;
          }
        }

        root.children.push({
          type: "list",
          ordered: isOrdered,
          items: listItems,
        });
        continue;
      }

      // 5. Empty Lines
      if (line.trim() === "") {
        i++;
        continue;
      }

      // 6. Paragraph Default (Spec 4.8)
      const paragraphLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !this.isRawHtmlBlockStart(lines[i]) &&
        !lines[i].match(/^( {0,3})(`{3,}|~{3,})/) &&
        !lines[i].match(/^( {0,3})(#{1,6})\s/) &&
        !lines[i].match(/^( {0,3})([*+-]|\d{1,9}[\.\)])\s+/)
      ) {
        paragraphLines.push(lines[i].trim());
        i++;
      }

      if (paragraphLines.length > 0) {
        root.children.push({
          type: "paragraph",
          content: paragraphLines.join(" "),
        });
      }
    }

    return root.children;
  }

  // Helper methods for HTML block processing (Spec Section 4.6)
  private isRawHtmlBlockStart(line: string): boolean {
    const trimmed = line.trim();
    return (
      /^<([a-zA-Z][a-zA-Z0-9-]*)(?:\s|>|\/>|$)/.test(trimmed) ||
      /^<\/([a-zA-Z][a-zA-Z0-9-]*)(?:\s|>|$)/.test(trimmed)
    );
  }

  private isRawHtmlBlockEnd(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.endsWith("</dl>") || trimmed.endsWith("</div>") || trimmed === "";
  }

  // ---------------------------------------------------------------------------
  // PHASE 2: INLINE PARSING
  // ---------------------------------------------------------------------------

  private parseInlines(text: string): string {
    let result = text;

    // 1. Escape HTML Entities if sanitization is enabled
    if (this.options.sanitizeHtml) {
      result = this.escapeHtml(result);
    }

    // 2. Inline Code Spans `code` (Spec 6.3)
    result = result.replace(/`([^`]+)`/g, (_, code) => {
      return `<code>${this.escapeHtml(code)}</code>`;
    });

    // 3. Strong Emphasis **text** or __text__ (Spec 6.2)
    result = result.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");

    // 4. Emphasis *text* or _text_ (Spec 6.2)
    result = result.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");

    // 5. Links [text](href) (Spec 6.5)
    result = result.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2">$1</a>'
    );

    return result;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---------------------------------------------------------------------------
  // PHASE 3: HTML RENDERING
  // ---------------------------------------------------------------------------

  private renderBlocks(blocks: BlockNode[]): string {
    const out: string[] = [];

    for (const block of blocks) {
      switch (block.type) {
        case "heading":
          out.push(
            `<h${block.level}>${this.parseInlines(block.content)}</h${block.level}>`
          );
          break;

        case "paragraph":
          out.push(`<p>${this.parseInlines(block.content)}</p>`);
          break;

        case "code_block":
          const langClass = block.info
            ? ` class="language-${this.escapeHtml(block.info)}"`
            : "";
          out.push(
            `<pre><code${langClass}>${this.escapeHtml(
              block.content
            )}\n</code></pre>`
          );
          break;

        case "html_block":
          out.push(block.content);
          break;

        case "list":
          const tag = block.ordered ? "ol" : "ul";
          const items = block.items
            .map((item) => `<li>${this.parseInlines(item)}</li>`)
            .join("");
          out.push(`<${tag}>\n${items}\n</${tag}>`);
          break;
      }
    }

    return out.join("\n\n");
  }
}

// Block Node Type Definitions
type BlockNode =
  | { type: "root"; children: BlockNode[] }
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "code_block"; info?: string; content: string }
  | { type: "html_block"; content: string }
  | { type: "list"; ordered: boolean; items: string[] };