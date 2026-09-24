import type { Env, SitemapEntry } from '../types';

/**
 * Renders an XML sitemap dynamically by listing all objects in Cloudflare R2 storage.
 * Extracts the accurate last modification date directly from Markdown frontmatter.
 */
export async function handleSitemapRoute(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const siteUrl = env.SITE_URL || new URL(request.url).origin;
  const entries: SitemapEntry[] = [];

  try {
    let truncated = true;
    let cursor: string | undefined = undefined;

    while (truncated) {
      const listOptions: R2ListOptions = {
        prefix: '',
      };

      if (cursor !== undefined) {
        listOptions.cursor = cursor;
      }

      const listResult = await env.CONTENT_BUCKET.list(listOptions);

      for (const object of listResult.objects) {
        if (!object.key.endsWith('.md')) {
          continue;
        }

        let path = object.key.replace(/\.md$/, '');
        if (path.endsWith('/index')) {
          path = path.slice(0, -5);
        }

        const loc = `${siteUrl}/${path.replace(/^\/+/, '')}`;
        let lastmod: string | undefined = undefined;

        // 1. Check custom metadata header first
        if (object.customMetadata && object.customMetadata['updatedAt']) {
          lastmod = object.customMetadata['updatedAt'];
        }

        // 2. Fallback: Read file from R2 and parse frontmatter directly
        if (!lastmod) {
          const contentObject = await env.CONTENT_BUCKET.get(object.key);
          if (contentObject) {
            const rawText = await contentObject.text();
            const frontmatterMatch = rawText.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);

            if (frontmatterMatch && frontmatterMatch[1]) {
              const yamlBlock = frontmatterMatch[1];
              const dateMatch = yamlBlock.match(/^updatedAt:\s*["']?([^"'\r\n]+)["']?/m);
              if (dateMatch && dateMatch[1]) {
                lastmod = dateMatch[1].trim();
              }
            }
          }
        }

        // 3. Final fallback: Use object upload timestamp
        if (!lastmod && object.uploaded) {
          lastmod = object.uploaded.toISOString().split('T')[0];
        }

        const entry: SitemapEntry = {
          loc,
          changefreq: path === '' ? 'daily' : 'weekly',
          priority: path === '' ? 1.0 : 0.8,
          ...(lastmod !== undefined ? { lastmod } : {}),
        };

        entries.push(entry);
      }

      truncated = listResult.truncated;
      if (truncated && 'cursor' in listResult && typeof listResult.cursor === 'string') {
        cursor = listResult.cursor;
      } else {
        cursor = undefined;
      }
    }

    const xml = buildSitemapXml(entries);

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    const fallbackXml = buildSitemapXml([
      {
        loc: siteUrl,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: 1.0,
      },
    ]);

    return new Response(fallbackXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
}

/**
 * Formats sitemap entries into standard XML schema.
 */
function buildSitemapXml(entries: SitemapEntry[]): string {
  const urlNodes = entries
    .map((entry) => {
      const lastmodNode = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
      const changefreqNode = entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : '';
      const priorityNode = entry.priority !== undefined ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : '';

      return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${lastmodNode}${changefreqNode}${priorityNode}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>`.trim();
}

/**
 * Escapes special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}