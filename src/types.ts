/**
 * Cloudflare Worker Environment Bindings
 */
export interface Env {
  CONTENT_BUCKET: R2Bucket;
  SITE_ANALYTICS?: AnalyticsEngineDataset;
  ASSETS: Fetcher;
  ENVIRONMENT?: string;
  SITE_URL?: string;
  SITE_NAME: string;
  DEFAULT_CACHE_TTL: string;
}

/**
 * Frontmatter metadata extracted from Markdown files
 */
export interface DocumentMeta {
  title?: string;
  description?: string;
  updatedAt?: string;
  lastUpdated?: string;
  publishedAt?: string;
  style?: string;
  id?: string;
  sidebarHtml?: string;
  [key: string]: unknown;
}

/**
 * Parsed Markdown document representation
 */
export interface ProcessedDocument {
  meta: DocumentMeta;
  contentHtml: string;
  rawMarkdown: string;
}

/**
 * Sitemap entry item structure
 */
export interface SitemapEntry {
  loc: string;
  lastmod?: string | undefined;
  changefreq?: ('always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never') | undefined;
  priority?: number | undefined;
}

export interface RequestContext {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
  url: URL;
  pathname: string;
}