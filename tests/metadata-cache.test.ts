import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { createCachedMetadataFetcher } from "../src/metadata-cache";

describe("createCachedMetadataFetcher", () => {
  it("persists fetched metadata to cache file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "metadata-cache-test-"));
    const cacheFilePath = join(dir, "cache.json");
    const baseFetcher = vi.fn(async () => ({
      title: "title",
      description: "description",
      image: "https://example.com/image.png",
    }));

    const fetchWithCache = createCachedMetadataFetcher({
      cacheFilePath,
      ttlMs: 24 * 60 * 60 * 1000,
      baseFetcher,
      now: () => 1_700_000_000_000,
    });

    await fetchWithCache("https://example.com");

    const cacheJson = JSON.parse(await readFile(cacheFilePath, "utf-8"));
    expect(cacheJson["https://example.com"].metadata.title).toBe("title");
  });

  it("returns cached value when ttl is not expired", async () => {
    const dir = await mkdtemp(join(tmpdir(), "metadata-cache-test-"));
    const cacheFilePath = join(dir, "cache.json");
    const baseFetcher = vi.fn(async () => ({
      title: "fresh-title",
      description: "fresh-description",
      image: "https://example.com/fresh.png",
    }));

    const firstFetcher = createCachedMetadataFetcher({
      cacheFilePath,
      ttlMs: 24 * 60 * 60 * 1000,
      baseFetcher,
      now: () => 1_700_000_000_000,
    });
    await firstFetcher("https://example.com");

    const secondBaseFetcher = vi.fn(async () => ({
      title: "should-not-be-used",
      description: "should-not-be-used",
      image: "https://example.com/other.png",
    }));
    const secondFetcher = createCachedMetadataFetcher({
      cacheFilePath,
      ttlMs: 24 * 60 * 60 * 1000,
      baseFetcher: secondBaseFetcher,
      now: () => 1_700_000_100_000,
    });

    const metadata = await secondFetcher("https://example.com");
    expect(metadata.title).toBe("fresh-title");
    expect(secondBaseFetcher).not.toHaveBeenCalled();
  });

  it("refreshes cache when ttl is expired", async () => {
    const dir = await mkdtemp(join(tmpdir(), "metadata-cache-test-"));
    const cacheFilePath = join(dir, "cache.json");
    const baseFetcher = vi.fn(async () => ({
      title: "old-title",
      description: "old-description",
      image: "https://example.com/old.png",
    }));

    const firstFetcher = createCachedMetadataFetcher({
      cacheFilePath,
      ttlMs: 1000,
      baseFetcher,
      now: () => 1000,
    });
    await firstFetcher("https://example.com");

    const secondBaseFetcher = vi.fn(async () => ({
      title: "new-title",
      description: "new-description",
      image: "https://example.com/new.png",
    }));
    const secondFetcher = createCachedMetadataFetcher({
      cacheFilePath,
      ttlMs: 1000,
      baseFetcher: secondBaseFetcher,
      now: () => 5000,
    });

    const metadata = await secondFetcher("https://example.com");
    expect(metadata.title).toBe("new-title");
    expect(secondBaseFetcher).toHaveBeenCalledTimes(1);
  });
});
