import { expect, test } from "@playwright/test";

type Rect = { left: number; right: number; top: number; bottom: number };

function overlaps(a: Rect, b: Rect): boolean {
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

for (const width of [320, 768, 1200]) {
  test(`does not create horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });

    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("cards do not overlap each other", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1200 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const boxes = await page.locator(".bento-container .card").evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      };
    }),
  );

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      expect(overlaps(boxes[i] as Rect, boxes[j] as Rect)).toBe(false);
    }
  }
});

test("link preview panel keeps visible height", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const heights = await page.locator(".link-card .link-preview").evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().height),
  );

  for (const height of heights) {
    expect(height).toBeGreaterThan(80);
  }
});
