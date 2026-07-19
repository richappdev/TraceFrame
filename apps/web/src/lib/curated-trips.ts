import type { Locale } from "./i18n";

type LocalizedText = Record<Locale, string>;

export interface CuratedTripDay {
  city: string;
  title: LocalizedText;
  description: LocalizedText;
  subjectIds: number[];
}

export interface CuratedTrip {
  slug: string;
  eyebrow: string;
  theme: "coral" | "sky" | "mint" | "gold";
  coverUrl: string;
  featuredWorks: LocalizedText;
  title: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  days: CuratedTripDay[];
}

export const curatedTrips: CuratedTrip[] = [
  {
    slug: "kyoto-uji-classics",
    eyebrow: "KYOTO / UJI · 2 DAYS",
    theme: "coral",
    coverUrl: "https://lain.bgm.tv/pic/cover/l/48/9d/1424_q8FMQ.jpg",
    featuredWorks: {
      "zh-CN": "《轻音少女》 · 《吹响吧！上低音号》",
      "zh-TW": "《K-ON！輕音部》 · 《吹響吧！上低音號》",
      "ja-JP": "『けいおん！』・『響け！ユーフォニアム』",
    },
    title: {
      "zh-CN": "京都与宇治经典巡礼",
      "zh-TW": "京都與宇治經典巡禮",
      "ja-JP": "京都・宇治 王道聖地巡礼",
    },
    tagline: {
      "zh-CN": "从轻音部的京都，走到吹奏乐回响的宇治。",
      "zh-TW": "從輕音部的京都，走到吹奏樂迴響的宇治。",
      "ja-JP": "軽音部の京都から、吹奏楽が響く宇治へ。",
    },
    description: {
      "zh-CN": "用两天串联关西最有代表性的校园音乐动画舞台。第一天留给京都的《轻音少女》，第二天搭乘电车前往宇治，沿《吹响吧！上低音号》的城市风景继续探索。",
      "zh-TW": "用兩天串聯關西最具代表性的校園音樂動畫舞台。第一天留給京都的《K-ON！輕音部》，第二天搭電車前往宇治，沿《吹響吧！上低音號》的城市風景繼續探索。",
      "ja-JP": "関西を代表する学園音楽アニメの舞台を2日で巡るプラン。1日目は京都の『けいおん！』、2日目は電車で宇治へ向かい、『響け！ユーフォニアム』の街並みをたどります。",
    },
    days: [
      {
        city: "京都市",
        title: { "zh-CN": "轻音部的京都", "zh-TW": "輕音部的京都", "ja-JP": "軽音部の京都" },
        description: {
          "zh-CN": "以《轻音少女》的舞台为主线，在京都安排轻松步调的一日巡礼。",
          "zh-TW": "以《K-ON！輕音部》的舞台為主線，在京都安排輕鬆步調的一日巡禮。",
          "ja-JP": "『けいおん！』の舞台を軸に、京都をゆったり巡ります。",
        },
        subjectIds: [1424],
      },
      {
        city: "宇治市",
        title: { "zh-CN": "吹奏乐回响的宇治", "zh-TW": "吹奏樂迴響的宇治", "ja-JP": "吹奏楽が響く宇治" },
        description: {
          "zh-CN": "沿宇治的河岸与街道寻找《吹响吧！上低音号》的熟悉画面。",
          "zh-TW": "沿宇治的河岸與街道尋找《吹響吧！上低音號》的熟悉畫面。",
          "ja-JP": "宇治川と街路を歩き、『響け！ユーフォニアム』の風景を探します。",
        },
        subjectIds: [115908],
      },
    ],
  },
  {
    slug: "greater-tokyo-music-trail",
    eyebrow: "TOKYO / KAWASAKI · 2 DAYS",
    theme: "sky",
    coverUrl: "https://lain.bgm.tv/pic/cover/l/e2/e7/328609_2EHLJ.jpg",
    featuredWorks: {
      "zh-CN": "《孤独摇滚！》 · MyGO!!!!! · 《少女乐队的呐喊》",
      "zh-TW": "《孤獨搖滾！》 · MyGO!!!!! · 《少女樂隊的吶喊》",
      "ja-JP": "『ぼっち・ざ・ろっく！』・MyGO!!!!!・『ガールズバンドクライ』",
    },
    title: {
      "zh-CN": "大东京乐队动画路线",
      "zh-TW": "大東京樂團動畫路線",
      "ja-JP": "東京・川崎 バンドアニメ旅",
    },
    tagline: {
      "zh-CN": "Live House、城市街角与三支不一样的少女乐队。",
      "zh-TW": "Live House、城市街角與三支截然不同的少女樂團。",
      "ja-JP": "ライブハウスと街角、三つの少女バンドを追う旅。",
    },
    description: {
      "zh-CN": "第一天集中探索东京的《孤独摇滚！》与《BanG Dream! It's MyGO!!!!!》，第二天前往川崎，进入《少女乐队的呐喊》的城市节奏。",
      "zh-TW": "第一天集中探索東京的《孤獨搖滾！》與《BanG Dream! It's MyGO!!!!!》，第二天前往川崎，進入《少女樂隊的吶喊》的城市節奏。",
      "ja-JP": "1日目は東京で『ぼっち・ざ・ろっく！』と『BanG Dream! It's MyGO!!!!!』を巡り、2日目は川崎で『ガールズバンドクライ』の街のリズムを味わいます。",
    },
    days: [
      {
        city: "东京都",
        title: { "zh-CN": "东京 Live House 日", "zh-TW": "東京 Live House 日", "ja-JP": "東京ライブハウスの日" },
        description: {
          "zh-CN": "将下北泽的乐队气息与 MyGO!!!!! 的东京舞台放进同一天。",
          "zh-TW": "將下北澤的樂團氣息與 MyGO!!!!! 的東京舞台放進同一天。",
          "ja-JP": "下北沢のバンド感とMyGO!!!!!の東京の舞台を一日にまとめます。",
        },
        subjectIds: [328609, 428735],
      },
      {
        city: "川崎市",
        title: { "zh-CN": "川崎的呐喊", "zh-TW": "川崎的吶喊", "ja-JP": "川崎の叫び" },
        description: {
          "zh-CN": "用一整天感受《少女乐队的呐喊》密集而鲜明的川崎舞台。",
          "zh-TW": "用一整天感受《少女樂隊的吶喊》密集而鮮明的川崎舞台。",
          "ja-JP": "『ガールズバンドクライ』の濃密な川崎の舞台を一日かけて巡ります。",
        },
        subjectIds: [431767],
      },
    ],
  },
  {
    slug: "tokyo-anime-highlights",
    eyebrow: "TOKYO · 2 DAYS",
    theme: "mint",
    coverUrl: "https://lain.bgm.tv/pic/cover/l/65/19/364450_xx2zx.jpg",
    featuredWorks: {
      "zh-CN": "《莉可丽丝》 · 《天气之子》 · 《白箱》",
      "zh-TW": "《莉可麗絲》 · 《天氣之子》 · 《白箱》",
      "ja-JP": "『リコリス・リコイル』・『天気の子』・『SHIROBAKO』",
    },
    title: {
      "zh-CN": "东京动画场景精选",
      "zh-TW": "東京動畫場景精選",
      "ja-JP": "東京アニメ舞台ハイライト",
    },
    tagline: {
      "zh-CN": "从晴空到雨幕，一次收集东京的不同表情。",
      "zh-TW": "從晴空到雨幕，一次收集東京的不同表情。",
      "ja-JP": "晴天から雨空まで、東京のさまざまな表情を集める。",
    },
    description: {
      "zh-CN": "把动作、青春与电影感装进两天：从《莉可丽丝》的东京日常到《天气之子》的雨中都市，再补上《白箱》与《别当欧尼酱了！》的生活舞台。",
      "zh-TW": "把動作、青春與電影感裝進兩天：從《莉可麗絲》的東京日常到《天氣之子》的雨中都市，再補上《白箱》與《別當歐尼醬了！》的生活舞台。",
      "ja-JP": "アクション、青春、映画的な風景を2日間に凝縮。『リコリス・リコイル』の日常から『天気の子』の雨の東京、『SHIROBAKO』『お兄ちゃんはおしまい！』の生活圏まで巡ります。",
    },
    days: [
      {
        city: "东京都",
        title: { "zh-CN": "动作与电影感", "zh-TW": "動作與電影感", "ja-JP": "アクションと映画の東京" },
        description: {
          "zh-CN": "串联《莉可丽丝》与《天气之子》呈现的两种东京。",
          "zh-TW": "串聯《莉可麗絲》與《天氣之子》呈現的兩種東京。",
          "ja-JP": "『リコリス・リコイル』と『天気の子』が描く二つの東京をつなぎます。",
        },
        subjectIds: [364450, 269235],
      },
      {
        city: "东京都 / 练马区",
        title: { "zh-CN": "动画与生活街区", "zh-TW": "動畫與生活街區", "ja-JP": "アニメと暮らしの街" },
        description: {
          "zh-CN": "从动画制作现场的气息，走进更贴近日常的住宅街风景。",
          "zh-TW": "從動畫製作現場的氣息，走進更貼近日常的住宅街風景。",
          "ja-JP": "アニメ制作の空気から、日常に近い住宅街の風景へ。",
        },
        subjectIds: [110467, 378862],
      },
    ],
  },
  {
    slug: "yamanashi-camping-escape",
    eyebrow: "YAMANASHI · 1 DAY",
    theme: "gold",
    coverUrl: "https://lain.bgm.tv/pic/cover/l/18/bc/207195_2Cp3o.jpg",
    featuredWorks: {
      "zh-CN": "《摇曳露营△》",
      "zh-TW": "《搖曳露營△》",
      "ja-JP": "『ゆるキャン△』",
    },
    title: {
      "zh-CN": "山梨露营系慢旅行",
      "zh-TW": "山梨露營系慢旅行",
      "ja-JP": "山梨 ゆるキャン△小旅行",
    },
    tagline: {
      "zh-CN": "放慢速度，把富士山与湖畔空气留给一天。",
      "zh-TW": "放慢速度，把富士山與湖畔空氣留給一天。",
      "ja-JP": "ペースを落として、富士山と湖畔の空気に浸る一日。",
    },
    description: {
      "zh-CN": "以《摇曳露营△》为唯一主角的山梨一日灵感路线。这里不追求打卡数量，而是为交通、湖景与户外停留预留充足时间。",
      "zh-TW": "以《搖曳露營△》為唯一主角的山梨一日靈感路線。這裡不追求打卡數量，而是為交通、湖景與戶外停留預留充足時間。",
      "ja-JP": "『ゆるキャン△』だけを主役にした山梨の日帰りプラン。スポット数を追わず、移動と湖畔、アウトドアで過ごす時間をたっぷり確保します。",
    },
    days: [
      {
        city: "山梨县",
        title: { "zh-CN": "湖畔与富士山", "zh-TW": "湖畔與富士山", "ja-JP": "湖畔と富士山" },
        description: {
          "zh-CN": "从 Anitabi 地图挑选同一区域的地点，避免把悠闲旅行排成赶场。",
          "zh-TW": "從 Anitabi 地圖挑選同一區域的地點，避免把悠閒旅行排成趕場。",
          "ja-JP": "Anitabiの地図から同じエリアを選び、ゆるい旅を詰め込みすぎないようにします。",
        },
        subjectIds: [207195],
      },
    ],
  },
];

export function getCuratedTrip(slug: string): CuratedTrip | undefined {
  return curatedTrips.find((trip) => trip.slug === slug);
}

export function curatedTripSubjectIds(trip: CuratedTrip): number[] {
  return [...new Set(trip.days.flatMap((day) => day.subjectIds))];
}

export function curatedTripsForSubject(subjectId: number): CuratedTrip[] {
  return curatedTrips.filter((trip) => curatedTripSubjectIds(trip).includes(subjectId));
}

export function curatedCopy(locale: Locale) {
  return locale === "ja-JP"
    ? {
        galleryTitle: "旅のきっかけを見つける",
        galleryIntro: "検証済みの作品データから作った、すぐ開けるモデルコースです。詳細な地点はAnitabiで確認できます。",
        featured: "おすすめモデルコース",
        viewAll: "すべてのコースを見る",
        open: "コースを見る",
        use: "この旅を自分用にする",
        works: "作品",
        points: "確認済みポイント",
        day: "日目",
        note: "このコースは作品・都市単位の旅の骨組みです。地点の順番や営業時間、交通はAnitabiと現地情報で確認してください。",
      }
    : locale === "zh-TW"
      ? {
          galleryTitle: "找到下一趟旅程的靈感",
          galleryIntro: "依據已驗證作品資料整理的即開即用示範路線；詳細地點請在 Anitabi 查看。",
          featured: "精選示範路線",
          viewAll: "查看全部路線",
          open: "查看路線",
          use: "建立我的版本",
          works: "作品",
          points: "已驗證地點",
          day: "天",
          note: "這是作品與城市層級的旅程骨架。地點順序、營業時間與交通方式，請搭配 Anitabi 及當地最新資訊確認。",
        }
      : {
          galleryTitle: "找到下一趟旅行的灵感",
          galleryIntro: "依据已验证作品数据整理的即开即用示范路线；详细地点请在 Anitabi 查看。",
          featured: "精选示范路线",
          viewAll: "查看全部路线",
          open: "查看路线",
          use: "创建我的版本",
          works: "作品",
          points: "已验证地点",
          day: "天",
          note: "这是作品与城市层级的旅行骨架。地点顺序、营业时间和交通方式，请配合 Anitabi 与当地最新信息确认。",
        };
}
