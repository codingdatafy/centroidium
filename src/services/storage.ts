import { Env } from '../types';

/**
 * Retrieves a raw Markdown document from the Cloudflare R2 bucket.
 * Uses native text decoding without external dependencies.
 */
export async function fetchMarkdownFromR2(
  bucket: R2Bucket,
  key: string
): Promise<string | null> {
  try {
    const object = await bucket.get(key);

    if (!object) {
      return null;
    }

    return await object.text();
  } catch (error: unknown) {
    console.error(`[R2 Storage Error] Failed to fetch object key "${key}":`, error);
    return null;
  }
}

/**
 * Lists all Markdown object keys stored in the Cloudflare R2 bucket.
 * Handles pagination automatically for full catalog listing.
 */
export async function listAllContentKeys(bucket: R2Bucket): Promise<string[]> {
  const keys: string[] = [];
  let truncated = true;
  let cursor: string | undefined;

  try {
    while (truncated) {
      const listResult: R2Objects = await bucket.list({
        limit: 1000,
        cursor,
      });

      for (const object of listResult.objects) {
        if (object.key.endsWith('.md')) {
          keys.push(object.key);
        }
      }

      truncated = listResult.truncated;
      cursor = listResult.truncated ? listResult.cursor : undefined;
    }
  } catch (error: unknown) {
    console.error('[R2 Storage Error] Failed to list bucket objects:', error);
  }

  return keys;
}