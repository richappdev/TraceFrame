export const locales = ["zh-CN", "zh-TW", "ja-JP"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh-CN";
/** @deprecated Firebase Hosting strips this cookie; locale preference uses `__session`. */
export const LOCALE_COOKIE = "anipins_locale";
/** @deprecated Prefer LOCALE_COOKIE; still read for old browsers. */
export const LEGACY_LOCALE_COOKIE = "traceframe_locale";
/**
 * Firebase Hosting only forwards `__session` to Cloud Run. Anonymous locale
 * preference is stored as `locale:<Locale>` in that cookie when no auth/OAuth
 * payload is present. Must stay edge-safe (no node:crypto).
 */
export const SESSION_COOKIE_NAME = "__session";
export const LOCALE_PREFERENCE_PREFIX = "locale:";

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function localePreferenceValue(locale: Locale): string {
  return `${LOCALE_PREFERENCE_PREFIX}${locale}`;
}

export function localeFromSessionCookie(value: string | null | undefined): Locale | null {
  if (!value?.startsWith(LOCALE_PREFERENCE_PREFIX)) return null;
  const locale = value.slice(LOCALE_PREFERENCE_PREFIX.length);
  return isLocale(locale) ? locale : null;
}

/** Prefer Firebase's preserved client language when the CDN rewrites Accept-Language. */
export function acceptLanguageFromHeaders(getHeader: (name: string) => string | null): string | null {
  return getHeader("x-orig-accept-language") ?? getHeader("accept-language");
}

export function detectLocale(value: string | null | undefined): Locale {
  if (!value) return defaultLocale;
  const normalized = value.toLowerCase();
  if (normalized.includes("ja")) return "ja-JP";
  if (normalized.includes("zh-tw") || normalized.includes("zh-hant") || normalized.includes("zh-hk")) {
    return "zh-TW";
  }
  return defaultLocale;
}

export function localePath(locale: Locale, path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}

export function localeFromPathname(pathname: string | null | undefined): Locale | null {
  if (!pathname) return null;
  const first = pathname.split("/").filter(Boolean)[0];
  return isLocale(first) ? first : null;
}

export function formatDateTime(value: string | number | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const cityLabels: Record<string, Partial<Record<Locale, string>>> = {
  "未标注城市": { "zh-TW": "未標示城市", "ja-JP": "都市未設定" },
  "东京": { "zh-TW": "東京", "ja-JP": "東京" },
  "东京都": { "zh-TW": "東京都", "ja-JP": "東京都" },
  "京都": { "zh-TW": "京都", "ja-JP": "京都" },
  "京都府": { "zh-TW": "京都府", "ja-JP": "京都府" },
  "大阪": { "zh-TW": "大阪", "ja-JP": "大阪" },
  "大阪府": { "zh-TW": "大阪府", "ja-JP": "大阪府" },
  "神奈川县": { "zh-TW": "神奈川縣", "ja-JP": "神奈川県" },
  "埼玉县": { "zh-TW": "埼玉縣", "ja-JP": "埼玉県" },
  "千叶县": { "zh-TW": "千葉縣", "ja-JP": "千葉県" },
  "山梨县": { "zh-TW": "山梨縣", "ja-JP": "山梨県" },
  "静冈县": { "zh-TW": "靜岡縣", "ja-JP": "静岡県" },
  "爱知县": { "zh-TW": "愛知縣", "ja-JP": "愛知県" },
  "兵库县": { "zh-TW": "兵庫縣", "ja-JP": "兵庫県" },
  "广岛县": { "zh-TW": "廣島縣", "ja-JP": "広島県" },
  "北海道": { "zh-TW": "北海道", "ja-JP": "北海道" },
};

export function localizeCity(city: string, locale: Locale): string {
  if (!city || city === "—") return city;
  return city
    .split(" / ")
    .map((part) => cityLabels[part]?.[locale] ?? part)
    .join(" / ");
}

export function localizedTitle(
  item: { title?: string | null; titleCn?: string | null; subjectId: number },
  locale: Locale,
): string {
  if (locale === "ja-JP") return item.title || item.titleCn || `#${item.subjectId}`;
  return item.titleCn || item.title || `#${item.subjectId}`;
}

export const copy = {
  "zh-CN": {
    site: {
      title: "AniPins — 动画巡礼行程规划",
      description: "从 Bangumi 收藏找到 Anitabi 巡礼地图，并规划 1–3 天的城市行程。",
      home: "AniPins 首页", tagline: "巡礼行程手帖", nav: "主导航",
      discover: "发现", library: "收藏", trips: "行程", policy: "数据政策", plan: "规划路线",
      footer: "把喜欢的故事，排进真实旅程。", privacy: "隐私与数据删除", license: "数据与许可政策",
      contact: "联系", language: "语言",
    },
    common: {
      login: "使用 Bangumi 登录", oauthMissing: "OAuth 未配置", browsePresence: "先浏览 Presence",
      map: "Anitabi 地图", points: "个取景点", days: "天", works: "部作品", unmappedCity: "未标注城市",
      mapped: "已映射", checking: "核对中", unmapped: "未映射", all: "全部", edit: "编辑", sharePage: "分享页",
    },
    home: {
      eyebrow: "出发前的地图钉", title1: "把喜欢的故事，", title2: "排进真实旅程。",
      lede: "从 Bangumi 收藏出发，筛出 Anitabi 已收录的巡礼作品，再把散落的坐标整理成一份清楚、可分享的城市行程。",
      start: "开始规划", browse: "浏览巡礼索引", feature1: "天轻行程", feature2: "城市优先", feature3: "安心分享",
      example: "东京两日巡礼示例", exampleTitle: "东京坐标散步", stepTitle: "从收藏到出发，只差三步。",
      stepIntro: "不复制地图，也不替你决定旅程。AniPins 只把作品、城市与路线线索整理到恰到好处。",
      steps: [["连接收藏", "用 Bangumi 登录，把想看的作品变成你的巡礼候选清单。"], ["确认坐标", "对照 Anitabi 已验证覆盖，按城市找到真正可以出发的作品。"], ["排成旅程", "选择 1–3 天，让作品按城市成行，再微调顺序并分享给旅伴。"]],
      explore: "先从一座城市，找到一部作品。", openIndex: "打开城市索引",
    },
    presence: {
      title: "Presence 索引", intro: "公开浏览已验证的 Anitabi 覆盖条目。点击地图深链跳转 Anitabi，本站不镜像 POI 截图。",
      cities: "城市", works: "作品", noCity: "暂无已验证条目。试试其他城市，或查看全部索引。",
      noData: "暂无 Presence 数据。请先运行 presence:import。", faq: "收藏里有作品但这里没有？",
      faqBody: "Presence 只收录已验证且有取景点的条目。同步收藏后，未映射作品会进入异步核对队列，由后台探测 Anitabi /lite；核对中会显示「核对中」。未映射仍不代表 Anitabi 一定没有，也可能尚未探测或被风控挡住。详细 POI 请走 Anitabi 深链。",
      goLibrary: "去 Library（登录后对照收藏）", plan: "从已映射作品规划行程",
    },
    library: {
      title: "Library", loginIntro: "登录 Bangumi 后，可查看收藏中哪些作品在 Anitabi 有巡礼地图覆盖。",
      publicIndex: "先浏览公开 Presence 索引", possessive: "的收藏", sync: "同步收藏", showAll: "显示全部",
      mappedOnly: "仅看已映射", plan: "规划行程", myTrips: "我的行程", logout: "退出",
      empty: "暂无条目。请先同步收藏，或关闭「仅看已映射」筛选。", clickSync: "点击同步从 Bangumi 拉取收藏",
      wish: "想看", collect: "看过", do: "在看", on_hold: "搁置", dropped: "抛弃",
    },
    trips: {
      title: "我的行程", loginIntro: "登录后可查看已保存的 1–3 天巡礼草稿与分享链接。",
      intro: "分享链接为只读，不含 Anitabi POI 截图。", new: "规划新行程", empty: "还没有行程。",
      emptyAction: "从已映射作品生成一份 1–3 天草稿。",
    },
    newTrip: {
      title: "规划行程", loginIntro: "登录后可从已映射收藏生成 1–3 天城市级巡礼草稿，并分享只读链接。",
      intro: "选择已映射作品，按城市自动分到 1–3 天。行程只保存元数据与 Anitabi 深链，不镜像 POI 截图。",
      noPicks: "暂无可用作品。请先同步 Library，或等待 Presence 索引导入。",
      fallback: "收藏中尚无已映射作品，已改用公开 Presence 索引供试填。建议先同步 Library。",
      tripTitle: "行程标题", placeholder: "例如：东京两日巡礼", dayCount: "天数", choose: "选择作品",
      generate: "生成行程", back: "返回 Library",
      errors: { empty: "请至少选择一部已映射作品。", unmapped: "所选作品在 Presence 中均无覆盖。", failed: "创建失败，请稍后重试。" },
    },
    editor: {
      title: "编辑行程", instruction: "调整顺序后点保存", myTrips: "我的行程", another: "再规划一份",
      openShare: "打开分享页", readonly: "只读分享", rotate: "更换链接", revoke: "撤销分享",
      private: "当前未公开分享。", createShare: "生成分享链接", tripTitle: "行程标题", save: "保存修改",
      saving: "保存中…", upDay: "上移天", downDay: "下移天", saved: "已保存",
      shareFailed: "分享设置失败", saveFailed: "保存失败", network: "网络错误，请重试",
      revoked: "旧分享链接已撤销", generated: "已生成新的分享链接", defaultTitle: "我的巡礼行程",
    },
    shared: { readonly: "只读分享", mapNote: "地图跳转 Anitabi", makeOwn: "自己也规划一份", index: "Presence 索引" },
    access: { title: "需要访问权限", body: "此行程仅所有者可编辑。若你有分享链接，请打开只读分享页。", open: "打开分享页", login: "登录" },
    privacy: {
      title: "隐私与账户数据", p1: "AniPins 保存 Bangumi 用户标识、加密 OAuth token、收藏条目和你创建的行程。浏览器只接收 httpOnly 会话 cookie；服务不会把 OAuth token 写入 localStorage。",
      p2: "公开分享页只显示行程元数据和 Anitabi 深链。更换或撤销分享链接后，旧链接立即失效。",
      p3: "你可以删除账户、同步收藏和全部行程。删除不可恢复，并会同时退出登录。",
      confirm: "输入 DELETE 以确认永久删除", delete: "永久删除我的全部数据", login: "登录后可在此删除账户数据。",
    },
    policyPage: {
      title: "数据与许可政策", p1: "当前 MVP 仅保存作品级 Presence 元数据和 Anitabi 地图深链，不保存或转售 Anitabi 的 POI 明细、巡礼截图或离线数据包。",
      p2: "Anitabi 内容标注为 CC BY-NC-SA 4.0；Bangumi 条目数据按其 API 规则使用。在取得书面商业授权或建立自有合法 POI 数据前，AniPins 不启用付费规划、联盟营销或商业数据导出。",
      p3: "Presence 刷新使用人工确认的候选集合。遇到 Cloudflare 403/挑战会立即停止，不轮换出口继续枚举。",
    },
    siteBlocked: {
      title: "站点优化中",
      body: "AniPins 正在优化体验，很快就会回来。请稍后再访问。",
    },
  },
  "zh-TW": {
    site: {
      title: "AniPins — 動畫聖地巡禮行程規劃", description: "從 Bangumi 收藏找到 Anitabi 聖地巡禮地圖，規劃 1–3 天的城市行程。",
      home: "AniPins 首頁", tagline: "聖地巡禮手帖", nav: "主要導覽", discover: "探索", library: "收藏", trips: "行程", policy: "資料政策", plan: "規劃路線",
      footer: "把喜歡的故事，排進真實旅程。", privacy: "隱私與資料刪除", license: "資料與授權政策", contact: "聯絡", language: "語言",
    },
    common: { login: "使用 Bangumi 登入", oauthMissing: "OAuth 尚未設定", browsePresence: "先瀏覽 Presence", map: "Anitabi 地圖", points: "個取景點", days: "天", works: "部作品", unmappedCity: "未標示城市", mapped: "已對應", checking: "核對中", unmapped: "未對應", all: "全部", edit: "編輯", sharePage: "分享頁" },
    home: {
      eyebrow: "出發前的地圖釘", title1: "把喜歡的故事，", title2: "排進真實旅程。", lede: "從 Bangumi 收藏出發，找出 Anitabi 已收錄的聖地巡禮作品，再將散落的座標整理成清楚、可分享的城市行程。",
      start: "開始規劃", browse: "瀏覽聖地巡禮索引", feature1: "天輕旅行", feature2: "城市優先", feature3: "安心分享", example: "東京兩日聖地巡禮範例", exampleTitle: "東京座標散步", stepTitle: "從收藏到出發，只差三步。",
      stepIntro: "不複製地圖，也不替你決定旅程。AniPins 只將作品、城市與路線線索整理得恰到好處。", steps: [["連結收藏", "使用 Bangumi 登入，把想看的作品變成聖地巡禮候選清單。"], ["確認座標", "對照 Anitabi 已驗證的涵蓋資料，依城市找到真正能出發的作品。"], ["排成旅程", "選擇 1–3 天，讓作品依城市成行，再微調順序並分享給旅伴。"]],
      explore: "先從一座城市，找到一部作品。", openIndex: "開啟城市索引",
    },
    presence: { title: "Presence 索引", intro: "公開瀏覽已驗證的 Anitabi 涵蓋條目。點選地圖連結前往 Anitabi；本站不鏡像 POI 截圖。", cities: "城市", works: "作品", noCity: "目前沒有已驗證條目。請試試其他城市或查看完整索引。", noData: "目前沒有 Presence 資料。請先執行 presence:import。", faq: "收藏中有作品，但這裡沒有？", faqBody: "Presence 只收錄已驗證且有取景點的條目。同步收藏後，未對應作品會進入非同步核對佇列，由背景探測 Anitabi /lite；核對中會顯示「核對中」。未對應仍不代表 Anitabi 一定沒有資料，也可能尚未探測或受到存取限制。詳細 POI 請前往 Anitabi。", goLibrary: "前往 Library（登入後對照收藏）", plan: "從已對應作品規劃行程" },
    library: { title: "Library", loginIntro: "登入 Bangumi 後，可查看收藏中的作品是否有 Anitabi 聖地巡禮地圖。", publicIndex: "先瀏覽公開 Presence 索引", possessive: "的收藏", sync: "同步收藏", showAll: "顯示全部", mappedOnly: "只看已對應", plan: "規劃行程", myTrips: "我的行程", logout: "登出", empty: "目前沒有條目。請先同步收藏，或關閉「只看已對應」篩選。", clickSync: "點選同步，從 Bangumi 取得收藏", wish: "想看", collect: "看過", do: "在看", on_hold: "擱置", dropped: "放棄" },
    trips: { title: "我的行程", loginIntro: "登入後可查看已儲存的 1–3 天聖地巡禮草稿與分享連結。", intro: "分享連結為唯讀，不含 Anitabi POI 截圖。", new: "規劃新行程", empty: "目前還沒有行程。", emptyAction: "從已對應作品建立 1–3 天草稿。" },
    newTrip: { title: "規劃行程", loginIntro: "登入後可從已對應收藏建立 1–3 天城市級聖地巡禮草稿，並分享唯讀連結。", intro: "選擇已對應作品，依城市自動分配至 1–3 天。行程只儲存中繼資料與 Anitabi 連結，不鏡像 POI 截圖。", noPicks: "目前沒有可用作品。請先同步 Library，或等待 Presence 索引匯入。", fallback: "收藏中尚無已對應作品，已改用公開 Presence 索引供試用。建議先同步 Library。", tripTitle: "行程標題", placeholder: "例如：東京兩日聖地巡禮", dayCount: "天數", choose: "選擇作品", generate: "產生行程", back: "返回 Library", errors: { empty: "請至少選擇一部已對應作品。", unmapped: "所選作品在 Presence 中都沒有資料。", failed: "建立失敗，請稍後再試。" } },
    editor: { title: "編輯行程", instruction: "調整順序後請儲存", myTrips: "我的行程", another: "再規劃一份", openShare: "開啟分享頁", readonly: "唯讀分享", rotate: "更換連結", revoke: "撤銷分享", private: "目前未公開分享。", createShare: "產生分享連結", tripTitle: "行程標題", save: "儲存變更", saving: "儲存中…", upDay: "上移一天", downDay: "下移一天", saved: "已儲存", shareFailed: "分享設定失敗", saveFailed: "儲存失敗", network: "網路錯誤，請再試一次", revoked: "舊分享連結已撤銷", generated: "已產生新的分享連結", defaultTitle: "我的聖地巡禮行程" },
    shared: { readonly: "唯讀分享", mapNote: "地圖連結將前往 Anitabi", makeOwn: "我也要規劃", index: "Presence 索引" },
    access: { title: "需要存取權限", body: "此行程只有擁有者能編輯。若你有分享連結，請開啟唯讀分享頁。", open: "開啟分享頁", login: "登入" },
    privacy: { title: "隱私與帳戶資料", p1: "AniPins 會儲存 Bangumi 使用者識別碼、加密的 OAuth token、收藏條目與你建立的行程。瀏覽器只會收到 httpOnly 工作階段 cookie；服務不會將 OAuth token 寫入 localStorage。", p2: "公開分享頁只顯示行程中繼資料與 Anitabi 連結。更換或撤銷分享連結後，舊連結會立即失效。", p3: "你可以刪除帳戶、同步收藏與所有行程。刪除後無法復原，並會同時登出。", confirm: "輸入 DELETE 以確認永久刪除", delete: "永久刪除我的所有資料", login: "登入後可在此刪除帳戶資料。" },
    policyPage: { title: "資料與授權政策", p1: "目前 MVP 只儲存作品級 Presence 中繼資料與 Anitabi 地圖連結，不儲存或轉售 Anitabi 的 POI 明細、聖地巡禮截圖或離線資料包。", p2: "Anitabi 內容標示為 CC BY-NC-SA 4.0；Bangumi 條目資料依其 API 規則使用。在取得書面商業授權或建立自有合法 POI 資料前，AniPins 不啟用付費規劃、聯盟行銷或商業資料匯出。", p3: "Presence 更新使用人工確認的候選集合。遇到 Cloudflare 403 或驗證挑戰時會立即停止，不會輪換出口繼續列舉。" },
    siteBlocked: {
      title: "網站優化中",
      body: "AniPins 正在優化體驗，很快就會回來。請稍後再造訪。",
    },
  },
  "ja-JP": {
    site: { title: "AniPins — アニメ聖地巡礼プランナー", description: "BangumiのコレクションからAnitabiの聖地巡礼マップを見つけ、1〜3日間の旅程を作成します。", home: "AniPins ホーム", tagline: "聖地巡礼手帖", nav: "メインナビゲーション", discover: "見つける", library: "コレクション", trips: "旅程", policy: "データポリシー", plan: "ルートを作る", footer: "好きな物語を、現実の旅へ。", privacy: "プライバシーとデータ削除", license: "データとライセンス", contact: "お問い合わせ", language: "言語" },
    common: { login: "Bangumiでログイン", oauthMissing: "OAuthが未設定です", browsePresence: "Presenceを見る", map: "Anitabiマップ", points: "か所", days: "日", works: "作品", unmappedCity: "都市未設定", mapped: "対応あり", checking: "確認中", unmapped: "対応なし", all: "すべて", edit: "編集", sharePage: "共有ページ" },
    home: { eyebrow: "旅立つ前のピン", title1: "好きな物語を、", title2: "現実の旅へ。", lede: "BangumiのコレクションからAnitabiに登録済みの作品を探し、点在する舞台を分かりやすく共有できる都市別の旅程にまとめます。", start: "プランを作る", browse: "聖地巡礼インデックス", feature1: "日の小旅行", feature2: "都市を優先", feature3: "安心して共有", example: "東京2日間の例", exampleTitle: "東京ロケ地散歩", stepTitle: "コレクションから出発まで、3ステップ。", stepIntro: "地図を複製せず、旅を勝手に決めることもありません。AniPinsは作品、都市、ルートの手がかりを使いやすく整理します。", steps: [["コレクションを連携", "Bangumiでログインし、見たい作品を聖地巡礼の候補にします。"], ["舞台を確認", "Anitabiで確認済みの情報と照合し、実際に訪ねられる作品を都市別に探します。"], ["旅程にまとめる", "1〜3日を選び、都市別にまとめた作品の順番を調整して同行者と共有します。"]], explore: "まずは一つの都市、一つの作品から。", openIndex: "都市インデックスを開く" },
    presence: { title: "Presenceインデックス", intro: "確認済みのAnitabi対応作品を閲覧できます。地図リンクはAnitabiへ移動します。このサイトはPOI画像を複製しません。", cities: "都市", works: "作品", noCity: "確認済みの作品はありません。別の都市または全件をお試しください。", noData: "Presenceデータがありません。presence:importを先に実行してください。", faq: "コレクションの作品が見つからない場合", faqBody: "Presenceには、確認済みで舞台情報がある作品だけを掲載しています。コレクション同期後、未対応の作品は非同期の確認キューに入り、バックグラウンドでAnitabi /liteを照合します。確認中は「確認中」と表示されます。未対応でもAnitabiに情報がないとは限らず、未確認またはアクセス制限の可能性があります。詳細なPOIはAnitabiをご覧ください。", goLibrary: "Libraryでコレクションと照合", plan: "対応作品から旅程を作る" },
    library: { title: "Library", loginIntro: "Bangumiでログインすると、コレクション内でAnitabiの聖地巡礼マップに対応している作品を確認できます。", publicIndex: "公開Presenceインデックスを見る", possessive: "のコレクション", sync: "コレクションを同期", showAll: "すべて表示", mappedOnly: "対応作品のみ", plan: "旅程を作る", myTrips: "自分の旅程", logout: "ログアウト", empty: "作品がありません。コレクションを同期するか、「対応作品のみ」を解除してください。", clickSync: "同期してBangumiからコレクションを取得", wish: "見たい", collect: "見た", do: "見てる", on_hold: "保留", dropped: "中断" },
    trips: { title: "自分の旅程", loginIntro: "ログインすると、保存した1〜3日間の聖地巡礼プランと共有リンクを確認できます。", intro: "共有リンクは閲覧専用で、AnitabiのPOI画像は含みません。", new: "新しい旅程", empty: "旅程はまだありません。", emptyAction: "対応作品から1〜3日間の下書きを作成します。" },
    newTrip: { title: "旅程を作る", loginIntro: "ログインすると、対応済みのコレクションから1〜3日間の都市別プランを作り、閲覧専用リンクで共有できます。", intro: "対応作品を選ぶと、都市ごとに1〜3日へ自動で振り分けます。旅程にはメタデータとAnitabiリンクのみを保存し、POI画像は複製しません。", noPicks: "利用できる作品がありません。Libraryを同期するか、Presenceの取り込みをお待ちください。", fallback: "コレクションに対応作品がないため、公開Presenceインデックスを表示しています。先にLibraryを同期することをおすすめします。", tripTitle: "旅程タイトル", placeholder: "例：東京2日間の聖地巡礼", dayCount: "日数", choose: "作品を選択", generate: "旅程を作成", back: "Libraryへ戻る", errors: { empty: "対応作品を1件以上選択してください。", unmapped: "選択した作品にはPresence情報がありません。", failed: "作成できませんでした。しばらくしてからもう一度お試しください。" } },
    editor: { title: "旅程を編集", instruction: "順番を調整して保存してください", myTrips: "自分の旅程", another: "別の旅程を作る", openShare: "共有ページを開く", readonly: "閲覧専用リンク", rotate: "リンクを変更", revoke: "共有を解除", private: "現在は共有されていません。", createShare: "共有リンクを作成", tripTitle: "旅程タイトル", save: "変更を保存", saving: "保存中…", upDay: "前の日へ", downDay: "次の日へ", saved: "保存しました", shareFailed: "共有設定に失敗しました", saveFailed: "保存に失敗しました", network: "ネットワークエラーです。もう一度お試しください", revoked: "以前の共有リンクを無効にしました", generated: "新しい共有リンクを作成しました", defaultTitle: "聖地巡礼の旅程" },
    shared: { readonly: "閲覧専用", mapNote: "地図はAnitabiで開きます", makeOwn: "自分の旅程を作る", index: "Presenceインデックス" },
    access: { title: "アクセス権が必要です", body: "この旅程を編集できるのは所有者だけです。共有リンクをお持ちの場合は、閲覧専用ページを開いてください。", open: "共有ページを開く", login: "ログイン" },
    privacy: { title: "プライバシーとアカウントデータ", p1: "AniPinsはBangumiのユーザー識別子、暗号化したOAuth token、コレクション項目、作成した旅程を保存します。ブラウザにはhttpOnlyセッションcookieのみを送信し、OAuth tokenをlocalStorageへ保存しません。", p2: "公開共有ページには旅程のメタデータとAnitabiリンクだけを表示します。共有リンクを変更または解除すると、以前のリンクは直ちに無効になります。", p3: "アカウント、同期したコレクション、すべての旅程を削除できます。削除は取り消せず、同時にログアウトします。", confirm: "完全に削除するにはDELETEと入力してください", delete: "自分のデータをすべて削除", login: "ログインすると、ここでアカウントデータを削除できます。" },
    policyPage: { title: "データとライセンス", p1: "現在のMVPは作品単位のPresenceメタデータとAnitabiマップへのリンクだけを保存します。AnitabiのPOI詳細、聖地巡礼画像、オフラインデータを保存または再販売しません。", p2: "AnitabiのコンテンツはCC BY-NC-SA 4.0として表示され、Bangumiの作品データはAPIルールに従って利用します。書面による商用許諾を得るか、適法な独自POIデータを構築するまで、有料プラン、アフィリエイト、商用データ出力は提供しません。", p3: "Presenceの更新には人が確認した候補だけを使用します。Cloudflare 403やチャレンジが発生した場合は直ちに停止し、接続元を切り替えて列挙を続けません。" },
    siteBlocked: {
      title: "メンテナンス中",
      body: "AniPinsは現在最適化のため調整しています。まもなく再開しますので、しばらくしてから再度アクセスしてください。",
    },
  },
} as const;

export function getCopy(locale: Locale) {
  return copy[locale];
}

export function collectionLabel(value: string, locale: Locale): string {
  const labels = getCopy(locale).library;
  const candidate = labels[value as keyof typeof labels];
  return typeof candidate === "string" ? candidate : value;
}

export function localeFromCookieHeader(cookieHeader: string | null): Locale {
  const parts = cookieHeader
    ?.split(";")
    .map((part) => part.trim().split("=")) ?? [];
  const session = parts.find(([name]) => name === SESSION_COOKIE_NAME)?.[1];
  const fromSession = localeFromSessionCookie(session);
  if (fromSession) return fromSession;
  const legacy = parts.find(([name]) => name === LOCALE_COOKIE || name === LEGACY_LOCALE_COOKIE)?.[1];
  return isLocale(legacy) ? legacy : defaultLocale;
}
