"use client";

import { useEffect, useState } from "react";
import {
  hasAnalyticsConfig,
  hasAnalyticsConsentDecision,
  setAnalyticsConsent,
} from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";

const copy = {
  "zh-CN": {
    body: "我们使用 Firebase Analytics 的匿名使用事件来改进路线体验。不会发送 Bangumi 登录信息。",
    accept: "允许分析",
    decline: "暂不允许",
  },
  "zh-TW": {
    body: "我們使用 Firebase Analytics 的匿名使用事件來改善路線體驗。不會傳送 Bangumi 登入資訊。",
    accept: "允許分析",
    decline: "暫不允許",
  },
  "ja-JP": {
    body: "ルート体験の改善のため、Firebase Analytics で匿名の利用イベントを収集します。Bangumi のログイン情報は送信しません。",
    accept: "分析を許可",
    decline: "許可しない",
  },
} as const;

export function AnalyticsConsent({ locale }: { locale: Locale }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(hasAnalyticsConfig() && !hasAnalyticsConsentDecision());
  }, []);

  function choose(value: "granted" | "denied") {
    setAnalyticsConsent(value);
    setVisible(false);
  }

  if (!visible) return null;
  const c = copy[locale];

  return (
    <aside className="analytics-consent" aria-label="Analytics consent">
      <p>{c.body}</p>
      <div className="cta-row">
        <button className="btn btn-primary" type="button" onClick={() => choose("granted")}>
          {c.accept}
        </button>
        <button className="btn" type="button" onClick={() => choose("denied")}>
          {c.decline}
        </button>
      </div>
    </aside>
  );
}
