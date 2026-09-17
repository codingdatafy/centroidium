import { ProcessedDocument, DocumentMeta, TableOfContentsItem } from '../types';
import { markdatafy } from './markdatafy';

/**
 * Processor for Site Markdown content:
 * Extracts frontmatter metadata, converts markdown body, and generates dynamic TOC.
 */
export function processMarkdown(rawMarkdown: string): ProcessedDocument {
  const { meta, body } = parseFrontmatter(rawMarkdown);
  const toc = extractTableOfContents(body);
  const contentHtml = markdatafy(body);

  return {
    meta,
    contentHtml,
    toc,
    rawMarkdown,
  };
}

/**
 * Zero-dependency YAML-like Frontmatter parser
 * Parses `---` delimited blocks at the top of markdown files
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