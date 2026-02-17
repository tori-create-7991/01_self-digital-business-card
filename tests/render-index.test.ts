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
});
