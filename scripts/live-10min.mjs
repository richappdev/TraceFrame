/**
 * ~10 min live AniPins UX exploration.
 * Avoids re-clicking the same Bangumi subject / Anitabi map / episode-like links.
 *
 * Env: BGM_CHII_AUTH, BGM_CHII_SID, BGM_CHII_SEC_ID (optional; guest mode if missing)
 *      LIVE_MINUTES (default 10)
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE =
  process.env.ANIPINS_URL ||
  process.env.TRACEFRAME_URL ||
  "https://antiable-anipin.web.app";
const MINUTES = Math.max(1, Number(process.env.LIVE_MINUTES || 10));
const DURATION_MS = MINUTES * 60 * 1000;
const OUT = join(process.cwd(), "reports", "live-10min");
const CHII_AUTH = (process.env.BGM_CHII_AUTH || "").trim();
const CHII_SID = (process.env.BGM_CHII_SID || "").trim();
const CHII_SEC_ID = (process.env.BGM_CHII_SEC_ID || "").trim();

mkdirSync(OUT, { recursive: true });

const visitedSubjects = new Set();
const visitedUrls = new Set();
const visitedCities = new Set();
const actions = [];
const bugs = [];

function log(action, detail = {}) {
  const row = { t: new Date().toISOString(), action, ...detail };
  actions.push(row);
  console.log(`[${row.t.slice(11, 19)}] ${action}${detail.note ? ` — ${detail.note}` : ""}`);
}

function subjectFromHref(href) {
  if (!href) return null;
  const m =
    href.match(/bangumiId=(\d+)/i) ||
    href.match(/\/subject\/(\d+)/) ||
    href.match(/[?&]id=(\d+)/);
  return m ? Number(m[1]) : null;
}

function isEpisodeLike(text, href) {
  const s = `${text || ""} ${href || ""}`.toLowerCase();
  return /episode|ep\b|第\s*\d+\s*话|第\s*\d+\s*集|\/ep\/|episodes?/i.test(s);
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true }).catch(() => {});
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function ensureAniPinsSession(page, context) {
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  if (/的收藏/.test(body) && !/使用 Bangumi 登录/.test(body)) {
    log("already_logged_in", { note: (await page.locator("h1").first().textContent())?.trim() });
    return true;
  }
  if (!CHII_AUTH) {
    log("guest_mode", { note: "no Bangumi cookies" });
    return false;
  }
  await context.addCookies([
    {
      name: "chii_auth",
      value: CHII_AUTH,
      domain: ".bgm.tv",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
    ...(CHII_SID
      ? [
          {
            name: "chii_sid",
            value: CHII_SID,
            domain: ".bgm.tv",
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
          },
        ]
      : []),
    ...(CHII_SEC_ID
      ? [
          {
            name: "chii_sec_id",
            value: CHII_SEC_ID,
            domain: ".bgm.tv",
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
          },
        ]
      : []),
  ]);
  const login = page.getByRole("link", { name: /使用 Bangumi 登录/ });
  if (await login.count()) {
    await login.click();
    await page.waitForLoadState("networkidle");
    await sleep(1200);
    const authorize = page
      .locator(
        'button:has-text("授权"), input[type="submit"][value*="授权"], a:has-text("授权"), button:has-text("同意")',
      )
      .first();
    if (await authorize.count()) {
      await authorize.click();
      await page.waitForLoadState("networkidle");
    } else {
      const submit = page.locator('input[type="submit"], button[type="submit"]').first();
      if (await submit.count()) {
        await submit.click();
        await page.waitForLoadState("networkidle");
      }
    }
    await page.waitForURL(/hosted\.app|\/library/, { timeout: 25000 }).catch(() => {});
  }
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  const h1 = ((await page.locator("h1").first().textContent()) || "").trim();
  const ok = /的收藏/.test(h1);
  log("oauth_login", { note: h1, ok });
  return ok;
}

async function clickUniqueMapOrTitle(page) {
  const links = page.locator('a[href*="anitabi.cn/map"], a[href*="bangumiId="]');
  const n = await links.count();
  for (let i = 0; i < n; i++) {
    const link = links.nth(i);
    const href = (await link.getAttribute("href")) || "";
    const text = ((await link.textContent()) || "").trim();
    if (isEpisodeLike(text, href)) {
      log("skip_episode_like", { note: `${text} ${href}` });
      continue;
    }
    const sid = subjectFromHref(href);
    if (sid != null && visitedSubjects.has(sid)) {
      log("skip_duplicate_show", { note: `subject ${sid}` });
      continue;
    }
    if (visitedUrls.has(href)) continue;

    visitedUrls.add(href);
    if (sid != null) visitedSubjects.add(sid);

    const [popup] = await Promise.all([
      page.context().waitForEvent("page", { timeout: 5000 }).catch(() => null),
      link.click(),
    ]);
    if (popup) {
      await popup.waitForLoadState("domcontentloaded").catch(() => {});
      log("open_map", { note: popup.url(), subjectId: sid });
      await sleep(800 + Math.random() * 1200);
      await popup.close().catch(() => {});
    } else {
      log("open_map_same_tab", { note: page.url(), subjectId: sid });
      await sleep(1000);
      if (!page.url().startsWith(BASE)) await page.goto(`${BASE}/presence`);
    }
    return true;
  }
  return false;
}

async function explorePresence(page, deadline) {
  await page.goto(`${BASE}/presence`, { waitUntil: "networkidle" });
  log("presence_open", { note: page.url() });
  await shot(page, `presence-${Date.now()}`);

  const chips = page.locator(".city-chips a");
  const chipCount = await chips.count();
  const order = [...Array(chipCount).keys()].sort(() => Math.random() - 0.5);

  for (const idx of order) {
    if (Date.now() > deadline) break;
    const chip = chips.nth(idx);
    const label = ((await chip.textContent()) || "").trim();
    if (!label || label.startsWith("全部")) continue;
    const cityKey = label.split("·")[0].trim();
    if (visitedCities.has(cityKey)) {
      log("skip_duplicate_city", { note: cityKey });
      continue;
    }
    visitedCities.add(cityKey);
    await chip.click();
    await page.waitForLoadState("networkidle");
    log("city_filter", { note: `${label} → ${page.url()}` });
    await sleep(600 + Math.random() * 900);
    await clickUniqueMapOrTitle(page);
    await sleep(500 + Math.random() * 800);
    // refresh chip locator after navigation
    if (!page.url().includes("/presence")) {
      await page.goto(`${BASE}/presence`, { waitUntil: "networkidle" });
    }
  }

  // Also browse unfiltered list for unused shows
  await page.goto(`${BASE}/presence`, { waitUntil: "networkidle" });
  await clickUniqueMapOrTitle(page);
}

async function exploreLibrary(page, loggedIn) {
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  const h1 = ((await page.locator("h1").first().textContent()) || "").trim();
  log("library_open", { note: h1 });
  await shot(page, `library-${Date.now()}`);
  if (!loggedIn) return;

  const sync = page.getByRole("button", { name: /同步收藏/ });
  if (await sync.count()) {
    await sync.click();
    await page.waitForLoadState("networkidle");
    const meta = ((await page.locator(".hero p").first().textContent().catch(() => "")) || "").trim();
    log("sync_library", { note: meta });
  }

  const filter = page.getByRole("link", { name: /仅看已映射/ }).first();
  if (await filter.count()) {
    await filter.click();
    await page.waitForLoadState("networkidle");
    log("library_filter_mapped", { note: page.url() });
  }

  // Click unique Anitabi links in library, skip duplicates + episode-like
  await clickUniqueMapOrTitle(page);

  const showAll = page.getByRole("link", { name: /显示全部/ }).first();
  if (await showAll.count()) {
    await showAll.click();
    await page.waitForLoadState("networkidle");
    log("library_filter_all", { note: page.url() });
  }
}

async function exploreTrips(page, loggedIn, deadline) {
  await page.goto(`${BASE}/trips`, { waitUntil: "networkidle" });
  log("trips_list", { note: page.url() });
  await shot(page, `trips-${Date.now()}`);

  if (!loggedIn) {
    await page.goto(`${BASE}/trips/new`, { waitUntil: "networkidle" });
    log("trips_new_guest", { note: page.url() });
    return;
  }

  await page.goto(`${BASE}/trips/new`, { waitUntil: "networkidle" });
  const boxes = page.locator('input[type="checkbox"][name="subjectId"]');
  const n = await boxes.count();
  const picked = [];
  for (let i = 0; i < n && picked.length < 3; i++) {
    const val = await boxes.nth(i).getAttribute("value");
    const sid = Number(val);
    if (!Number.isFinite(sid) || visitedSubjects.has(sid)) {
      log("skip_duplicate_show_trip_pick", { note: `subject ${sid}` });
      continue;
    }
    // Prefer unseen shows for trip
    await boxes.nth(i).check();
    visitedSubjects.add(sid);
    picked.push(sid);
  }
  if (picked.length === 0 && n > 0) {
    // all already visited — pick first unseen-by-trip only if needed
    await boxes.nth(0).check();
    picked.push(Number(await boxes.nth(0).getAttribute("value")));
  }
  if (picked.length > 0) {
    const title = `Live10 ${new Date().toISOString().slice(5, 16)}`;
    await page.locator('input[name="title"]').fill(title);
    await page.getByRole("button", { name: /生成行程/ }).click();
    await page.waitForLoadState("networkidle");
    log("create_trip", { note: `${page.url()} picks=${picked.join(",")}` });
    await shot(page, `trip-${Date.now()}`);

    if (Date.now() < deadline && /\/trips\//.test(page.url())) {
      const share = page.locator('a[href^="/t/"]').first();
      if (await share.count()) {
        const href = await share.getAttribute("href");
        if (href && !visitedUrls.has(href)) {
          visitedUrls.add(href);
          await page.goto(new URL(href, BASE).toString(), { waitUntil: "networkidle" });
          log("share_view", { note: page.url() });
          // On share page, open unique maps only
          await clickUniqueMapOrTitle(page);
        }
      }
    }
  } else {
    log("trips_new_empty", { note: "no checkboxes" });
  }
}

async function randomNav(page) {
  const paths = ["/", "/presence", "/library", "/trips", "/api/health"];
  const unused = paths.filter((p) => !visitedUrls.has(BASE + p) || Math.random() > 0.5);
  const path = unused[Math.floor(Math.random() * unused.length)] || "/";
  const url = path.startsWith("http") ? path : BASE + path;
  await page.goto(url, { waitUntil: "networkidle" });
  visitedUrls.add(url);
  if (path === "/api/health") {
    const text = await page.locator("body").innerText();
    log("health", { note: text.slice(0, 120) });
  } else {
    log("nav", { note: page.url() });
  }
}

async function main() {
  const started = Date.now();
  const deadline = started + DURATION_MS;
  log("start", { note: `${MINUTES} min on ${BASE}` });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "zh-CN",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => bugs.push({ type: "pageerror", message: String(err) }));

  const loggedIn = await ensureAniPinsSession(page, context);

  // Loop UI exploration until time is up
  let round = 0;
  while (Date.now() < deadline) {
    round++;
    const remaining = Math.round((deadline - Date.now()) / 1000);
    log("round", { note: `#${round} remaining=${remaining}s visitedShows=${visitedSubjects.size}` });

    try {
      if (Date.now() < deadline) await explorePresence(page, deadline);
      if (Date.now() < deadline) await exploreLibrary(page, loggedIn);
      if (Date.now() < deadline) await exploreTrips(page, loggedIn, deadline);
      if (Date.now() < deadline) await randomNav(page);
    } catch (err) {
      bugs.push({ type: "action_error", message: String(err) });
      log("error", { note: String(err).slice(0, 200) });
      await page.goto(BASE + "/", { waitUntil: "domcontentloaded" }).catch(() => {});
    }

    await sleep(800 + Math.random() * 1500);
  }

  // Final personal data check
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  const finalH1 = ((await page.locator("h1").first().textContent()) || "").trim();
  const finalMeta = ((await page.locator(".hero p").first().textContent().catch(() => "")) || "").trim();
  await shot(page, "final-library");

  const report = {
    base: BASE,
    minutes: MINUTES,
    elapsedMs: Date.now() - started,
    loggedIn,
    personalData: { heading: finalH1, meta: finalMeta },
    uniqueShowsClicked: [...visitedSubjects],
    uniqueCities: [...visitedCities],
    actions: actions.length,
    bugs,
    actionLog: actions,
  };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  log("done", {
    note: `shows=${visitedSubjects.size} cities=${visitedCities.size} actions=${actions.length} bugs=${bugs.length}`,
  });
  console.log("Report:", join(OUT, "report.json"));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  writeFileSync(join(OUT, "report.json"), JSON.stringify({ error: String(err), actions, bugs }, null, 2));
  process.exit(1);
});
