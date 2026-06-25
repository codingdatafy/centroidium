/**
 * @project CodingDatafy
 * @license MIT
 * @copyright 2026 CodingDatafy Organization
 * @author CodingDatafy Team
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { cache } from 'react';

const DATA_DIRECTORY = path.join(process.cwd(), 'data');

const GITHUB_OWNER = 'CodingDatafy';
const GITHUB_REPO = 'content';
const GITHUB_BRANCH = 'main';

export interface PageMetadata {
  title: string;
  description: string;
  style: string | null;
  lastUpdated?: string;
  project?: string;
  license?: string;
  copyright?: string;
  author?: string;
  id?: string;
  [key: string]: any; 
}

export interface PageData {
  slug: string;
  contentHtml: string;
  sidebarHtml: string | null;
  meta: PageMetadata;
}

/**
 * FETCH ATOMIC FILE DATA DIRECTLY FROM THE CONTENT REPOSITORY VIA GITHUB RAW API
 */
const fetchFromGitHubApi = cache(async (relativePath: string): Promise<string | null> => {
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/data/${relativePath}`;
  
  const token = process.env.ORGANIZATION_GITHUB_TOKEN;
  const headers: HeadersInit = { 'User-Agent': 'CodingDatafy-Engine' };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    // Leveraging Next.js fetch cache configuration natively instead of unstable_cache
    const response = await fetch(rawUrl, { 
      headers,
      next: { revalidate: 3600, tags: ['github-content'] }
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.error(`[GitHub API Fallback Error]: Failed to fetch ${relativePath}`, error);
    return null;
  }
});

/**
 * FETCH ATOMIC LAST UPDATED TIMESTAMP FROM THE OFFICIALLY RECORDED GITHUB COMMITS API
 */
const getFileLastCommitDate = cache(async (targetFilePath: string): Promise<string> => {
  const fallbackDate = new Date().toISOString().split('T')[0];
  const commitApiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?path=data/${targetFilePath}&page=1&per_page=1`;

  const token = process.env.ORGANIZATION_GITHUB_TOKEN;
  const headers: HeadersInit = { 'User-Agent': 'CodingDatafy-Engine' };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const response = await fetch(commitApiUrl, { 
      headers,
      next: { revalidate: 3600, tags: ['github-history'] }
    });

    if (response.ok) {
      const commits = await response.json();
      if (commits && commits.length > 0) {
        return commits[0].commit.committer.date.split('T')[0];
      }
    }
    return fallbackDate;
  } catch (error) {
    console.error(`[GitHub Commits API Error]: Failed to fetch history for ${targetFilePath}`, error);
    return fallbackDate;
  }
});

/**
 * CORE MARKDOWN TRANSLATION ENGINE
 */
export async function getPageData(slugArray: string[] | undefined): Promise<PageData | null> {
  const relativePath = slugArray && slugArray.length > 0 ? slugArray.join('/') : 'index';
  let fileContents: string | null = null;
  let hasSidebar = false;
  let sidebarContents: string | null = null;
  let verifiedRepoPath = '';

  /**
   * STRATEGY 1: ACTIONS COMPILED / LOCAL FS INJECTION
   */
  let fullPath = path.join(DATA_DIRECTORY, relativePath, 'index.md');
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(DATA_DIRECTORY, `${relativePath}.md`);
    if (fs.existsSync(fullPath)) {
      verifiedRepoPath = `${relativePath}.md`;
    }
  } else {
    verifiedRepoPath = `${relativePath}/index.md`;
  }

  if (fs.existsSync(fullPath)) {
    fileContents = fs.readFileSync(fullPath, 'utf8');
    const currentDir = path.dirname(fullPath);
    const sidebarPath = path.join(currentDir, '_sidebar.md');
    if (fs.existsSync(sidebarPath)) {
      hasSidebar = true;
      sidebarContents = fs.readFileSync(sidebarPath, 'utf8');
    }
  } 
  /**
   * STRATEGY 2: LIVE GITHUB REPOSITORY RUNTIME FALLBACK
   */
  else {
    console.log(`[CodingDatafy Engine]: FS target missing. Falling back to GitHub API for: ${relativePath}`);
    
    fileContents = await fetchFromGitHubApi(`${relativePath}/index.md`);
    if (fileContents) {
      verifiedRepoPath = `${relativePath}/index.md`;
      sidebarContents = await fetchFromGitHubApi(`${relativePath}/_sidebar.md`);
      if (sidebarContents) hasSidebar = true;
    } else {
      fileContents = await fetchFromGitHubApi(`${relativePath}.md`);
      if (fileContents) {
        verifiedRepoPath = `${relativePath}.md`;
        const parentDir = relativePath.includes('/') ? relativePath.substring(0, relativePath.lastIndexOf('/')) : '';
        const sidebarTarget = parentDir ? `${parentDir}/_sidebar.md` : '_sidebar.md';
        sidebarContents = await fetchFromGitHubApi(sidebarTarget);
        if (sidebarContents) hasSidebar = true;
      }
    }
  }

  if (!fileContents) {
    console.warn(`[CodingDatafy Engine Warning]: Asset could not be resolved: ${relativePath}`);
    return null;
  }

  try {
    const { data, content } = matter(fileContents);

    const processedContent = await remark().use(html, { sanitize: false }).process(content);
    const contentHtml = processedContent.toString();

    let sidebarHtml: string | null = null;
    if (hasSidebar && sidebarContents) {
      const processedSidebar = await remark().use(html, { sanitize: false }).process(sidebarContents);
      sidebarHtml = processedSidebar.toString();
    }

    const lastUpdatedDate = await getFileLastCommitDate(verifiedRepoPath);

    return {
      slug: relativePath,
      contentHtml,
      sidebarHtml,
      meta: {
        title: data.title || 'CodingDatafy',
        description: data.description || 'Professional coding documentation.',
        style: data.style || null,
        lastUpdated: lastUpdatedDate,
        project: data.project,
        license: data.license,
        copyright: data.copyright,
        author: data.author,
        ...data 
      },
    };
  } catch (error) {
    console.error(`[CodingDatafy Engine Critical Error]: Parse exception on asset path: ${relativePath}`, error);
    return null;
  }
}

/**
 * DECOUPLED STATIC ROUTE GENERATOR
 */
export function getAllPostSlugs() {
  const getFiles = (dir: string, allFiles: any[] = []) => {
    if (!fs.existsSync(dir)) {
      console.warn(`[CodingDatafy Engine Warning]: Local data workspace missing during slug allocation.`);
      return allFiles;
    }

    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const name = path.join(dir, file);
      
      if (fs.statSync(name).isDirectory()) {
        getFiles(name, allFiles);
      } else if (file.endsWith('.md') && !file.startsWith('_') && !file.startsWith('.')) {
        const relativePath = path.relative(DATA_DIRECTORY, name);
        const slug = relativePath
          .replace(/\.md$/, '')
          .split(path.sep)
          .filter(segment => segment !== 'index' && segment !== '');
        
        allFiles.push({ slug });
      }
    });
    return allFiles;
  };
  
  return getFiles(DATA_DIRECTORY);
}