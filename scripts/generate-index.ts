import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { siteConfig } from "../src/config";
import { createCachedMetadataFetcher } from "../src/metadata-cache";
import { renderIndexHtml } from "../src/render-index";
import { resolveSiteConfigMetadata } from "../src/resolve-site-config";
import { fetchMetadataFromUrl } from "../src/scrape-metadata";

function getTtlMs(): number {
  const ttlHours = Number(process.env.METADATA_CACHE_TTL_HOURS ?? "24");
  if (!Number.isFinite(ttlHours) || ttlHours <= 0) {
    return 24 * 60 * 60 * 1000;
  }
  return ttlHours * 60 * 60 * 1000;
}

async function main(): Promise<void> {
  const targetPath = resolve(process.cwd(), "src/index.html");
  const cacheFilePath = resolve(
    process.cwd(),
    process.env.METADATA_CACHE_PATH ?? ".cache/metadata-cache.json",
  );
  const fetchWithCache = createCachedMetadataFetcher({
    cacheFilePath,
    ttlMs: getTtlMs(),
    baseFetcher: fetchMetadataFromUrl,
  });
  const resolvedConfig = await resolveSiteConfigMetadata(siteConfig, fetchWithCache);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, renderIndexHtml(resolvedConfig), "utf-8");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
