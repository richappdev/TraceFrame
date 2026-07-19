import { describe, expect, it } from "vitest";
import {
  acceptLanguageFromHeaders,
  detectLocale,
  localeFromCookieHeader,
  localeFromPathname,
  localeFromSessionCookie,
  localePath,
  localePreferenceValue,
  localizedTitle,
  localizeCity,
} from "./i18n";

describe("i18n helpers", () => {
  it("detects the supported browser locales", () => {
    expect(detectLocale("ja,en;q=0.8")).toBe("ja-JP");
    expect(detectLocale("zh-Hant-TW,zh;q=0.9")).toBe("zh-TW");
    expect(detectLocale("en-US")).toBe("zh-CN");
  });

  it("prefers Firebase X-Orig-Accept-Language when Accept-Language is rewritten", () => {
    const headers = new Map([
      ["accept-language", "zh"],
      ["x-orig-accept-language", "zh-TW,zh;q=0.9"],
    ]);
    expect(detectLocale(acceptLanguageFromHeaders((name) => headers.get(name) ?? null))).toBe("zh-TW");
  });

  it("builds locale-prefixed paths and reads Firebase-safe locale preference", () => {
    expect(localePath("ja-JP", "/trips/new")).toBe("/ja-JP/trips/new");
    expect(localePreferenceValue("zh-TW")).toBe("locale:zh-TW");
    expect(localeFromSessionCookie("locale:zh-TW")).toBe("zh-TW");
    expect(localeFromSessionCookie("eyJ1c2VyIjox.sig")).toBeNull();
    expect(localeFromCookieHeader("a=1; __session=locale:zh-TW")).toBe("zh-TW");
    expect(localeFromCookieHeader("a=1; anipins_locale=zh-TW")).toBe("zh-TW");
    expect(localeFromCookieHeader("a=1; traceframe_locale=zh-TW")).toBe("zh-TW");
    expect(localeFromPathname("/ja-JP/trips/new")).toBe("ja-JP");
  });

  it("uses original Japanese titles and localized city labels", () => {
    const title = { subjectId: 1, title: "君の名は。", titleCn: "你的名字。" };
    expect(localizedTitle(title, "ja-JP")).toBe("君の名は。");
    expect(localizedTitle(title, "zh-TW")).toBe("你的名字。");
    expect(localizeCity("神奈川县", "ja-JP")).toBe("神奈川県");
    expect(localizeCity("东京 / 京都", "zh-TW")).toBe("東京 / 京都");
  });
});
