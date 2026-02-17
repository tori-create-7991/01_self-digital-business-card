import type { InstagramCard, LinkCard, SiteConfig } from "./config";
import { fetchMetadataFromUrl, type ScrapedMetadata } from "./scrape-metadata";

type MetadataFetcher = (url: string) => Promise<ScrapedMetadata>;

function selectValue(
  scraped: string | null,
  fallback: string | undefined,
  existing: string,
): string {
  return scraped ?? fallback ?? existing;
}

function resolveLinkCard(card: LinkCard, metadata: ScrapedMetadata): LinkCard {
  return {
    ...card,
    previewImageUrl: selectValue(
      metadata.image,
      card.fallbackImage,
      card.previewImageUrl,
    ),
    label: selectValue(metadata.title, card.fallbackLabel, card.label),
    sublabel: selectValue(
      metadata.description,
      card.fallbackDescription,
      card.sublabel,
    ),
  };
}

async function resolveInstagramCard(
  card: InstagramCard,
  metadata: ScrapedMetadata,
  fetcher: MetadataFetcher,
): Promise<InstagramCard> {
  const resolvedImage =
    metadata.image ?? card.fallbackImage ?? card.images[0]?.src ?? null;
  const resolvedLabel = metadata.title ?? card.fallbackLabel ?? card.label;
  const resolvedImages = await Promise.all(
    card.images.map(async (image, index) => {
      const sourceUrl = image.sourceUrl ?? image.href;
      let tileMetadata: ScrapedMetadata;
      try {
        tileMetadata = await fetcher(sourceUrl);
      } catch {
        tileMetadata = { image: null, title: null, description: null };
      }

      return {
        src: tileMetadata.image ?? resolvedImage ?? image.src,
        alt: image.alt || `${resolvedLabel} thumbnail ${index + 1}`,
        href: image.href || card.url,
        sourceUrl,
      };
    }),
  );

  return {
    ...card,
    label: resolvedLabel,
    sublabel: metadata.description ?? card.fallbackDescription ?? card.sublabel,
    images: resolvedImages,
  };
}

export async function resolveSiteConfigMetadata(
  config: SiteConfig,
  fetcher: MetadataFetcher = fetchMetadataFromUrl,
): Promise<SiteConfig> {
  const cards = await Promise.all(
    config.cards.map(async (card) => {
      if (
        (card.type !== "link" && card.type !== "instagram") ||
        card.scrape === false ||
        !card.sourceUrl
      ) {
        return card;
      }

      let metadata: ScrapedMetadata;
      try {
        metadata = await fetcher(card.sourceUrl);
      } catch {
        metadata = { image: null, title: null, description: null };
      }
      if (!metadata.image && !metadata.title && !metadata.description) {
        console.warn(`[metadata] fallback used for ${card.sourceUrl}`);
      }

      if (card.type === "link") {
        return resolveLinkCard(card, metadata);
      }

      return resolveInstagramCard(card, metadata, fetcher);
    }),
  );

  return {
    ...config,
    cards,
  };
}
