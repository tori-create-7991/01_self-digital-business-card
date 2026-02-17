import { describe, expect, it } from "vitest";
import {
  fetchMetadataFromUrl,
  parseMetadataFromHtml,
} from "../src/scrape-metadata";

describe("parseMetadataFromHtml", () => {
  it("extracts og:image, og:title and og:description", () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="OG Title" />
          <meta property="og:description" content="OG Description" />
          <meta property="og:image" content="https://example.com/og.png" />
        </head>
      </html>
    `;

    expect(parseMetadataFromHtml(html)).toEqual({
      title: "OG Title",
      description: "OG Description",
      image: "https://example.com/og.png",
    });
  });

  it("falls back to twitter:image and title tag", () => {
    const html = `
      <html>
        <head>
          <title>Fallback Title</title>
          <meta name="twitter:image" content="https://example.com/twitter.jpg" />
        </head>
      </html>
    `;

    expect(parseMetadataFromHtml(html)).toEqual({
      title: "Fallback Title",
      description: null,
      image: "https://example.com/twitter.jpg",
    });
  });

  it("decodes HTML entities in extracted metadata", () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Ryo (&amp;#064;ryo_fren) &amp;#x2022; Photos" />
          <meta property="og:description" content="Tom &amp;amp; Jerry" />
        </head>
      </html>
    `;

    expect(parseMetadataFromHtml(html)).toEqual({
      title: "Ryo (@ryo_fren) • Photos",
      description: "Tom & Jerry",
      image: null,
    });
  });
});

describe("fetchMetadataFromUrl", () => {
  it("returns null metadata when fetch fails", async () => {
    const metadata = await fetchMetadataFromUrl(
      "https://example.com",
      async () => {
        throw new Error("network error");
      },
    );

    expect(metadata).toEqual({
      title: null,
      description: null,
      image: null,
    });
  });
});
