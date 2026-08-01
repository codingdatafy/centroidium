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
 * FETCH ATOMIC LAST UPDATED TIMESTAMP FROM GITHUB COMMITS API AT BUILD TIME
 */
const getFileLastCommitDate = cache(async (targetFilePath: string): Promise<string> => {
  const fallbackDate = "2026-05-01";

  if (!targetFilePath) {
    return fallbackDate;
  }

  const commitApiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?path=data/${targetFilePath}&page=1&per_page=1`;

  const token = process.env.ORGANIZATION_GITHUB_TOKEN || process.env.CENTROIDIUM_PAT;
  const headers: HeadersInit = { 
    'User-Agent': 'CodingDatafy-Engine',
    'Accept': 'application/vnd.github.v3+json'
  };

  if (token) {
    headers['Authorization'] = token.startsWith('github_pat_') || token.startsWith('ghp_') 
      ? `Bearer ${token}` 
      : `token ${token}`;
  }

  try {
    const response = await fetch(commitApiUrl, { headers });

    if (response.ok) {
      const commits = await response.json();
      if (Array.isArray(commits) && commits.length > 0 && commits[0]?.commit?.committer?.date) {
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
 * CORE MARKDOWN TRANSLATION ENGINE (BUILD-TIME DIRECT FS READ)
 */
export async function getPageData(slugArray: string[] | undefined): Promise<PageData | null> {
  const relativePath = slugArray && slugArray.length > 0 ? slugArray.join('/') : 'index';
  let fileContents: string | null = null;
  let hasSidebar = false;
  let sidebarContents: string | null = null;
  let verifiedRepoPath = '';

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
  } else {
    console.warn(`[CodingDatafy Engine Warning]: Local data workspace missing during static compilation: ${relativePath}`);
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

    // Extract exact commit timestamp from GitHub API during build step
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