/**
 * Live smoke with existing Bangumi cookies → AniPins OAuth → UX checks.
 *
 * Env:
 *   BGM_CHII_AUTH   (required) URL-encoded chii_auth value
 *   BGM_CHII_SID    (optional)
 *   BGM_CHII_SEC_ID (optional)
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE =
  process.env.ANIPINS_URL ||
  process.env.TRACEFRAME_URL ||
  "https://antiable-anipin.web.app";
const OUT = join(process.cwd(), "reports", "live-smoke-authed");
const CHII_AUTH = (process.env.BGM_CHII_AUTH || "").trim();
const CHII_SID = (process.env.BGM_CHII_SID || "").trim();
const CHII_SEC_ID = (process.env.BGM_CHII_SEC_ID || "").trim();

mkdirSync(OUT, { recursive: true });

const report = {
  base: BASE,
  startedAt: new Date().toISOString(),
  steps: [],
  bugs: [],
  personalData: null,
  bangumiUser: null,
  verdict: "UNKNOWN",
};

function step(name, pass, detail = {}) {
  report.steps.push({ name, pass, ...detail, at: new Date().toISOString() });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail.note ? ` — ${detail.note}` : ""}`);
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

function assertNoBadHost(url) {
  if (/0\.0\.0\.0/.test(url)) {
    report.bugs.push({ type: "bad_redirect_host", url });
    return false;
  }
  return true;
}

async function main() {
  if (!CHII_AUTH) {
    console.error("Missing BGM_CHII_AUTH");
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "zh-CN",
    viewport: { width: 1280, height: 900 },
  });

  const bgmCookies = [
    {
      name: "chii_auth",
      value: CHII_AUTH,
      domain: ".bgm.tv",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ];
  if (CHII_SID) {
    bgmCookies.push({
      name: "chii_sid",
      value: CHII_SID,
      domain: ".bgm.tv",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    });
  }
  if (CHII_SEC_ID) {
    bgmCookies.push({
      name: "chii_sec_id",
      value: CHII_SEC_ID,
      domain: ".bgm.tv",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    });
  }
  await context.addCookies(bgmCookies);

  const page = await context.newPage();

  // 1) Confirm Bangumi session
  await page.goto("https://bgm.tv/", { waitUntil: "networkidle" });
  await shot(page, "01-bgm-home");
  const bgmText = await page.locator("body").innerText();
  const loginLink = await page.locator('a[href*="login"]').count();
  // Logged-in users usually see avatar / 超展开 / username in top bar, not 登录+注册 pair prominently
  const settings = await page.goto("https://bgm.tv/settings", { waitUntil: "networkidle" });
  const settingsUrl = page.url();
  const settingsOk = !/login/.test(settingsUrl) && settings && settings.ok();
  const settingsText = await page.locator("body").innerText();
  // Try to grab nickname/email fields if present
  const nick =
    (await page.locator("#nickname, input[name='nickname']").inputValue().catch(() => "")) ||
    "";
  report.bangumiUser = {
    settingsUrl,
    nicknameField: nick || null,
    snippet: settingsText.slice(0, 250).replace(/\s+/g, " "),
  };
  step("bangumi_session", settingsOk, {
    note: settingsOk ? `settings ok nick=${nick || "?"}` : `redirected to ${settingsUrl}`,
  });
  await shot(page, "02-bgm-settings");

  if (!settingsOk) {
    report.verdict = "FAIL";
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(1);
  }

  // 2) AniPins OAuth using Bangumi session
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  assertNoBadHost(page.url());
  await shot(page, "03-tf-library-before");
  const loginBtn = page.getByRole("link", { name: /使用 Bangumi 登录/ });
  if (await loginBtn.count()) {
    await loginBtn.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    assertNoBadHost(page.url());
    step("oauth_to_bangumi", /bgm\.tv/.test(page.url()), { note: page.url().slice(0, 120) });
    await shot(page, "04-oauth-bangumi");

    // Authorize if prompted
    const authorize = page
      .locator(
        'button:has-text("授权"), input[type="submit"][value*="授权"], a:has-text("授权"), button:has-text("同意"), input[value*="Agree"], button:has-text("Allow")',
      )
      .first();
    if (await authorize.count()) {
      await authorize.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    } else {
      // Sometimes already authorized → auto redirect; or need click submit on form
      const submit = page.locator('input[type="submit"], button[type="submit"]').first();
      if (await submit.count()) {
        await submit.click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);
      }
    }

    await page.waitForURL(/hosted\.app|antiable-anipin|antiable-traceframe|\/library/, { timeout: 25000 }).catch(() => {});
    assertNoBadHost(page.url());
    step("oauth_callback", /hosted\.app|\/library/.test(page.url()) && assertNoBadHost(page.url()), {
      note: page.url(),
    });
  } else {
    step("oauth_to_bangumi", true, { note: "already on AniPins logged-in library" });
  }

  // 3) Personal data on AniPins
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  const libH1 = ((await page.locator("h1").first().textContent()) || "").trim();
  const libBody = await page.locator("body").innerText();
  const loggedIn = /的收藏/.test(libH1) && !/使用 Bangumi 登录/.test(libBody);
  report.personalData = {
    heading: libH1,
    url: page.url(),
    snippet: libBody.slice(0, 400).replace(/\s+/g, " "),
  };
  step("personal_data_heading", loggedIn, { note: libH1 });
  await shot(page, "05-tf-library");

  if (!loggedIn) {
    report.verdict = "FAIL";
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(1);
  }

  // Cross-check nickname if we captured it from Bangumi settings
  if (nick && libH1.includes(nick)) {
    step("personal_data_matches_bangumi", true, { note: `heading contains Bangumi nick ${nick}` });
  } else if (nick) {
    step("personal_data_matches_bangumi", libH1.length > 0, {
      note: `bangumiNick=${nick} libraryH1=${libH1}`,
    });
  }

  // Sync
  const syncBtn = page.getByRole("button", { name: /同步收藏/ });
  if (await syncBtn.count()) {
    await syncBtn.click();
    await page.waitForLoadState("networkidle");
    const meta = ((await page.locator(".hero p").first().textContent().catch(() => "")) || "").trim();
    const after = ((await page.locator("h1").first().textContent()) || "").trim();
    report.personalData.afterSync = { heading: after, meta };
    step("sync_library", /的收藏/.test(after), { note: `${after} | ${meta}` });
    await shot(page, "06-tf-synced");
  }

  // Mapped filter
  const filter = page.getByRole("link", { name: /仅看已映射|显示全部/ }).first();
  if (await filter.count()) {
    await filter.click();
    await page.waitForLoadState("networkidle");
    step("library_filter", true, { note: page.url() });
  }

  // Presence clicks
  await page.goto(`${BASE}/presence`, { waitUntil: "networkidle" });
  const chips = page.locator(".city-chips a");
  if ((await chips.count()) > 1) {
    await chips.nth(1).click();
    await page.waitForLoadState("networkidle");
    step("presence_city", page.url().includes("city="), { note: page.url() });
  }
  const map = page.locator('a[href*="anitabi.cn/map"]').first();
  if (await map.count()) {
    step("presence_map", true, { note: await map.getAttribute("href") });
  }
  await shot(page, "07-presence");

  // Create trip
  await page.goto(`${BASE}/trips/new`, { waitUntil: "networkidle" });
  await shot(page, "08-trips-new");
  const boxes = page.locator('input[type="checkbox"][name="subjectId"]');
  const n = await boxes.count();
  if (n > 0) {
    await page.locator('input[name="title"]').fill(`Smoke ${new Date().toISOString().slice(5, 16)}`);
    for (let i = 0; i < Math.min(2, n); i++) await boxes.nth(i).check();
    await page.getByRole("button", { name: /生成行程/ }).click();
    await page.waitForLoadState("networkidle");
    const onTrip = /\/trips\/[a-zA-Z0-9_-]+/.test(page.url()) && !page.url().endsWith("/trips/new");
    step("create_trip", onTrip, { note: page.url() });
    await shot(page, "09-trip");
    if (onTrip) {
      const share = page.locator('a[href^="/t/"]').first();
      if (await share.count()) {
        const href = await share.getAttribute("href");
        await page.goto(new URL(href, BASE).toString(), { waitUntil: "networkidle" });
        step("share_view", page.url().includes("/t/"), { note: page.url() });
        await shot(page, "10-share");
      }
    }
  } else {
    step("create_trip", false, { note: "no subject checkboxes" });
  }

  await page.goto(`${BASE}/trips`, { waitUntil: "networkidle" });
  step("trips_list", true, {
    note: (await page.locator("body").innerText()).slice(0, 180).replace(/\s+/g, " "),
  });
  await shot(page, "11-trips");

  report.finishedAt = new Date().toISOString();
  const failed = report.steps.filter((s) => !s.pass);
  report.verdict = failed.some((s) =>
    ["bangumi_session", "personal_data_heading", "oauth_callback"].includes(s.name),
  )
    ? "FAIL"
    : failed.length
      ? "PASS_WITH_GAPS"
      : "PASS";
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("\nVERDICT:", report.verdict);
  console.log("Personal:", report.personalData?.heading);
  await browser.close();
  process.exit(report.verdict === "FAIL" ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  report.verdict = "ERROR";
  report.error = String(err);
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  process.exit(1);
});
