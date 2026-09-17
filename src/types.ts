import { Request as CFRequest } from '@cloudflare/workers-types';

export interface Env {
  ASSETS: Fetcher;
  CONTENT_BUCKET: R2Bucket;
  SITE_ANALYTICS: AnalyticsEngineDataset;
  ENVIRONMENT: 'production' | 'staging' | 'development';
  SITE_URL: string;
  SITE_NAME: string;
  DEFAULT_CACHE_TTL: string;
}

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

export interface ProcessedDocument {
  meta: DocumentMeta;
  contentHtml: string;
  toc: TableOfContentsItem[];
  rawMarkdown: string;
}

export interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
}

export interface RequestContext {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
  url: URL;
  pathname: string;
}