import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ScrapedMetadata } from "./scrape-metadata";

type BaseFetcher = (url: string) => Promise<ScrapedMetadata>;
type NowFn = () => number;

type CacheEntry = {
  fetchedAt: number;
  metadata: ScrapedMetadata;
};

type CacheData = Record<string, CacheEntry>;

type CreateCachedMetadataFetcherInput = {
  cacheFilePath: string;
  ttlMs: number;
  baseFetcher: BaseFetcher;
  now?: NowFn;
};

async function loadCache(cacheFilePath: string): Promise<CacheData> {
  try {
    const content = await readFile(cacheFilePath, "utf-8");
    const parsed = JSON.parse(content) as CacheData;
    return parsed ?? {};
  } catch {
    return {};
  }
}

async function saveCache(cacheFilePath: string, cache: CacheData): Promise<void> {
  await mkdir(dirname(cacheFilePath), { recursive: true });
  await writeFile(cacheFilePath, JSON.stringify(cache, null, 2), "utf-8");
}

export function createCachedMetadataFetcher({
  cacheFilePath,
  ttlMs,
  baseFetcher,
  now = Date.now,
}: CreateCachedMetadataFetcherInput): BaseFetcher {
  return async (url: string) => {
    const cache = await loadCache(cacheFilePath);
    const entry = cache[url];

    if (entry && now() - entry.fetchedAt <= ttlMs) {
      return entry.metadata;
    }

    const metadata = await baseFetcher(url);
    cache[url] = {
      fetchedAt: now(),
      metadata,
    };
    await saveCache(cacheFilePath, cache);
    return metadata;
  };
}
