export type ScrapedMetadata = {
  title: string | null;
  description: string | null;
  image: string | null;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function decodeHtmlEntities(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  let decoded = value;
  for (let i = 0; i < 2; i += 1) {
    decoded = decoded
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCodePoint(Number.parseInt(hex, 16)),
      )
      .replace(/&#([0-9]+);/g, (_, num) =>
        String.fromCodePoint(Number.parseInt(num, 10)),
      );
  }
  return decoded;
}

function extractMetaContent(
  html: string,
  attr: "property" | "name",
  key: string,
): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<meta[^>]+${attr}=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const reverseRegex = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${escapedKey}["'][^>]*>`,
    "i",
  );
  const match = html.match(regex) ?? html.match(reverseRegex);
  return decodeHtmlEntities(match?.[1] ?? null);
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return decodeHtmlEntities(match?.[1]?.trim() ?? null);
}

export function parseMetadataFromHtml(html: string): ScrapedMetadata {
  const title =
    extractMetaContent(html, "property", "og:title") ??
    extractMetaContent(html, "name", "twitter:title") ??
    extractTitle(html);

  const description =
    extractMetaContent(html, "property", "og:description") ??
    extractMetaContent(html, "name", "twitter:description");

  const image =
    extractMetaContent(html, "property", "og:image") ??
    extractMetaContent(html, "name", "twitter:image");

  return {
    title,
    description,
    image,
  };
}

export async function fetchMetadataFromUrl(
  url: string,
  fetchFn: FetchLike = fetch,
): Promise<ScrapedMetadata> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; link-card-metadata-bot/1.0; +https://localhost)",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { title: null, description: null, image: null };
    }

    const html = await response.text();
    return parseMetadataFromHtml(html);
  } catch {
    return { title: null, description: null, image: null };
  }
}
