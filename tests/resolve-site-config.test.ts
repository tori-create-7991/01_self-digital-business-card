import { describe, expect, it } from "vitest";
import { resolveSiteConfigMetadata } from "../src/resolve-site-config";

describe("resolveSiteConfigMetadata", () => {
  it("prefers scraped metadata over fallback for link cards", async () => {
    const resolved = await resolveSiteConfigMetadata(
      {
        meta: {
          title: "title",
          description: "desc",
          favicon: "favicon",
        },
        profile: {
          name: "name",
          role: "role",
          imageUrl: "profile",
          imageAlt: "alt",
        },
        cards: [
          {
            type: "link",
            className: "website",
            url: "https://example.com",
            sourceUrl: "https://example.com",
            scrape: true,
            fallbackImage: "https://fallback/image.png",
            fallbackLabel: "Fallback Label",
            fallbackDescription: "fallback.com",
            previewImageUrl: "https://fallback/image.png",
            label: "Fallback Label",
            sublabel: "fallback.com",
          },
        ],
      } as any,
      async () => ({
        image: "https://scraped/image.png",
        title: "Scraped Title",
        description: "Scraped Description",
      }),
    );

    expect((resolved.cards[0] as any).previewImageUrl).toBe(
      "https://scraped/image.png",
    );
    expect((resolved.cards[0] as any).label).toBe("Scraped Title");
    expect((resolved.cards[0] as any).sublabel).toBe("Scraped Description");
  });

  it("uses fallback metadata when scraping fails", async () => {
    const resolved = await resolveSiteConfigMetadata(
      {
        meta: {
          title: "title",
          description: "desc",
          favicon: "favicon",
        },
        profile: {
          name: "name",
          role: "role",
          imageUrl: "profile",
          imageAlt: "alt",
        },
        cards: [
          {
            type: "instagram",
            url: "https://instagram.com/user",
            sourceUrl: "https://instagram.com/user",
            scrape: true,
            iconClass: "fa-brands fa-instagram",
            fallbackLabel: "Fallback Insta",
            fallbackDescription: "@fallback",
            fallbackImage: "https://fallback/insta.jpg",
            label: "Fallback Insta",
            sublabel: "@fallback",
            images: [{ src: "https://fallback/insta.jpg", alt: "fallback" }],
          },
        ],
      } as any,
      async () => ({
        image: null,
        title: null,
        description: null,
      }),
    );

    expect((resolved.cards[0] as any).label).toBe("Fallback Insta");
    expect((resolved.cards[0] as any).sublabel).toBe("@fallback");
    expect((resolved.cards[0] as any).images[0].src).toBe(
      "https://fallback/insta.jpg",
    );
  });

  it("continues with fallback when metadata fetch throws", async () => {
    const resolved = await resolveSiteConfigMetadata(
      {
        meta: {
          title: "title",
          description: "desc",
          favicon: "favicon",
        },
        profile: {
          name: "name",
          role: "role",
          imageUrl: "profile",
          imageAlt: "alt",
        },
        cards: [
          {
            type: "link",
            className: "sora",
            url: "https://sora.chatgpt.com/profile/tori_24",
            sourceUrl: "https://sora.chatgpt.com/profile/tori_24",
            scrape: true,
            fallbackImage: "https://fallback/sora.png",
            fallbackLabel: "Sora Profile",
            fallbackDescription: "sora.chatgpt.com",
            previewImageUrl: "https://fallback/sora.png",
            label: "Sora Profile",
            sublabel: "sora.chatgpt.com",
          },
        ],
      } as any,
      async () => {
        throw new Error("blocked");
      },
    );

    expect((resolved.cards[0] as any).previewImageUrl).toBe(
      "https://fallback/sora.png",
    );
    expect((resolved.cards[0] as any).label).toBe("Sora Profile");
  });
});
