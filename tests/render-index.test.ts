import { describe, expect, it } from "vitest";
import { siteConfig } from "../src/config";
import { renderIndexHtml } from "../src/render-index";

describe("siteConfig shape", () => {
  it("contains profile and at least one card item", () => {
    expect(siteConfig.profile.name.length).toBeGreaterThan(0);
    expect(siteConfig.cards.length).toBeGreaterThan(0);
  });
});

describe("renderIndexHtml", () => {
  it("renders all configured external links with noopener and noreferrer", () => {
    const html = renderIndexHtml(siteConfig);

    for (const card of siteConfig.cards) {
      if (!("url" in card)) {
        continue;
      }

      expect(html).toContain(`href="${card.url}"`);
      expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    }
  });

  it("does not render blocked fallback label for Sora card", () => {
    const html = renderIndexHtml(siteConfig);
    expect(html).not.toContain("Just a moment...");
  });

  it("renders meta description", () => {
    const html = renderIndexHtml(siteConfig);
    expect(html).toContain('meta name="description"');
    expect(html).toContain(siteConfig.meta.description);
  });

  it("renders instagram card as hero + 3 story tiles", () => {
    const html = renderIndexHtml(siteConfig);
    const instagramCardStart = html.indexOf('class="card instagram-card"');
    expect(instagramCardStart).toBeGreaterThan(-1);
    const instagramSlice = html.slice(instagramCardStart, instagramCardStart + 3000);

    expect(instagramSlice).toContain('class="instagram-hero"');
    expect(instagramSlice).toContain('class="instagram-stories"');
    expect(
      (instagramSlice.match(/class="instagram-tile instagram-tile--hero"/g) ?? []).length,
    ).toBe(1);
    expect(
      (instagramSlice.match(/class="instagram-tile instagram-tile--story"/g) ?? []).length,
    ).toBe(3);
    expect(
      (instagramSlice.match(/target="_blank" rel="noopener noreferrer"/g) ?? [])
        .length,
    ).toBeGreaterThanOrEqual(5);
  });
});
