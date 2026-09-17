/**
 * Cloudflare Worker Environment Bindings
 * Matches the configuration defined in wrangler.jsonc
 */
export interface Env {
  ASSETS: Fetcher;
  CONTENT_BUCKET: R2Bucket;
  SITE_ANALYTICS: AnalyticsEngineDataset;
  ENVIRONMENT: 'production' | 'staging' | 'development';
  SITE_URL: string;
  SITE_NAME: string;
  DEFAULT_CACHE_TTL: string;
}

/**
 * Parsed Frontmatter metadata extracted from Markdown files
 */
export interface DocumentMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  draft?: boolean;
  [key: string]: unknown;
}

/**
 * Internal representation of a processed Markdown document
 */
export interface ProcessedDocument {
  meta: DocumentMeta;
  contentHtml: string;
  toc: TableOfContentsItem[];
  rawMarkdown: string;
}

/**
 * Structured Table of Contents item extracted from headings
 */
export interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Standardized Context passed to HTTP Handlers and Templates
 */
export interface RequestContext {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
  url: URL;
  pathname: string;
}