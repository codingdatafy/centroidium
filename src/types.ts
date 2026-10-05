/**
 * Cloudflare Worker Environment Bindings
 */
export interface Env {
  CONTENT_BUCKET: R2Bucket;
  SITE_ANALYTICS?: AnalyticsEngineDataset | undefined;
  ASSETS: Fetcher;
  ENVIRONMENT?: string | undefined;
  SITE_URL?: string | undefined;
  SITE_NAME: string;
  DEFAULT_CACHE_TTL: string;
}

/**
 * Frontmatter metadata extracted from Markdown files
 */
export interface DocumentMeta {
  title?: string | undefined;
  description?: string | undefined;
  updatedAt?: string | undefined;
  lastUpdated?: string | undefined;
  publishedAt?: string | undefined;
  style?: string | undefined;
  id?: string | undefined;
  sidebarHtml?: string | undefined;
  breadcrumb?: string | undefined;
  [key: string]: unknown;
}

/**
 * Parsed Markdown document representation
 */
export interface ProcessedDocument {
  meta: DocumentMeta;
  contentHtml: string;
  rawMarkdown: string;
  tocHtml?: string | undefined;
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
  startTime: number;
  cacheStatus: 'HIT' | 'MISS' | 'BYPASS';
}