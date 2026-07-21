import { describe, expect, it } from "vitest";
import { localePath } from "./i18n";
import { absoluteUrl, buildPageMetadata, localeAlternates } from "./seo";
import { SITE_URL } from "./site";

describe("seo helpers", () => {
  it("builds absolute URLs from the site origin", () => {
    expect(absoluteUrl("/zh-CN")).toBe(`${SITE_URL}/zh-CN`);
    expect(absoluteUrl("zh-CN/presence")).toBe(`${SITE_URL}/zh-CN/presence`);
  });

  it("emits absolute-ready hreflang alternates with x-default", () => {
    const alternates = localeAlternates("zh-TW", "/presence");
    expect(alternates.canonical).toBe(localePath("zh-TW", "/presence"));
    expect(alternates.languages).toMatchObject({
      "zh-CN": "/zh-CN/presence",
      "zh-TW": "/zh-TW/presence",
      "ja-JP": "/ja-JP/presence",
      "x-default": "/zh-CN/presence",
    });
  });

  it("builds page metadata with OG, Twitter, and robots", () => {
    const meta = buildPageMetadata({
      locale: "zh-CN",
      path: "/trips/explore/kyoto-uji-classics",
      title: "京都与宇治经典巡礼",
      description: "两天关西巡礼",
      image: "https://example.com/cover.jpg",
    });
    expect(meta.description).toBe("两天关西巡礼");
    expect(meta.openGraph?.url).toBe(
      `${SITE_URL}/zh-CN/trips/explore/kyoto-uji-classics`,
    );
    expect(meta.openGraph?.images).toEqual([
      { url: "https://example.com/cover.jpg", alt: "京都与宇治经典巡礼" },
    ]);
    expect(meta.openGraph?.locale).toBe("zh_CN");
    expect(meta.openGraph?.title).toBe("京都与宇治经典巡礼 · AniPins");
    expect(meta.twitter?.card).toBe("summary_large_image");
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it("marks private pages noindex", () => {
    const meta = buildPageMetadata({
      locale: "ja-JP",
      path: "/trips/abc",
      title: "編集",
      description: "private",
      noIndex: true,
    });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});
