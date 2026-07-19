"use client";

import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n";

const labels: Record<Locale, string> = { "zh-CN": "简体中文", "zh-TW": "繁體中文", "ja-JP": "日本語" };

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(zh-CN|zh-TW|ja-JP)(?=\/|$)/, "") || "";
  return (
    <div className="language-switcher" aria-label={label}>
      {locales.map((item) => (
        <a key={item} href={`/${item}${rest}`} lang={item} aria-current={locale === item ? "page" : undefined}>
          {labels[item]}
        </a>
      ))}
    </div>
  );
}
