/**
 * Live AniPins smoke: guest UX + OAuth entry + optional Bangumi login.
 * Usage:
 *   node scripts/live-smoke.mjs
 *   set BGM_EMAIL=... && set BGM_PASSWORD=... && node scripts/live-smoke.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.ANIPINS_URL || process.env.TRACEFRAME_URL || "https://antiable-anipin.web.app";
const OUT = join(process.cwd(), "reports", "live-smoke");
const BGM_EMAIL = process.env.BGM_EMAIL || "";
const BGM_PASSWORD = process.env.BGM_PASSWORD || "";
const BGM_REGISTER = process.env.BGM_REGISTER === "1";

mkdirSync(OUT, { recursive: true });

const report = {
  base: BASE,
  startedAt: new Date().toISOString(),
  steps: [],
  bugs: [],
  personalData: null,
  account: null,
  verdict: "UNKNOWN",
};

function step(name, pass, detail = {}) {
  report.steps.push({ name, pass, ...detail, at: new Date().toISOString() });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail.note ? ` — ${detail.note}` : ""}`);
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

function assertNoBadHost(url) {
  if (/0\.0\.0\.0|127\.0\.0\.1:8080/.test(url)) {
    report.bugs.push({ type: "bad_redirect_host", url });
    return false;
  }
  return true;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "zh-CN",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // 1) Health
  const healthRes = await page.request.get(`${BASE}/api/health`);
  const health = await healthRes.json();
  step("api_health", healthRes.ok() && health.ok === true && health.service === "anipins", {
    note: JSON.stringify(health),
  });
  if (health.phase !== "E3" && health.phase !== "E4") {
    report.bugs.push({ type: "unexpected_phase", phase: health.phase });
  }

  // 2) Homepage brand + URL
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  assertNoBadHost(page.url());
  const brand = (await page.locator(".hero-brand").first().textContent())?.trim();
  step("homepage_brand", brand === "ANIPINS" && page.url().startsWith(BASE), {
    note: `url=${page.url()} brand=${brand}`,
  });
  await shot(page, "01-home");

  // 3) Presence browse + city filter + map link
  await page.getByRole("link", { name: /浏览 Presence|Presence/i }).first().click();
  await page.waitForURL(/\/presence/);
  assertNoBadHost(page.url());
  const presenceH1 = (await page.locator("h1").first().textContent())?.trim();
  const cityChips = page.locator(".city-chips a");
  const chipCount = await cityChips.count();
  step("presence_page", /Presence/.test(presenceH1 || "") && chipCount > 0, {
    note: `h1=${presenceH1} chips=${chipCount}`,
  });
  await shot(page, "02-presence");

  let filteredCity = null;
  if (chipCount > 1) {
    const chip = cityChips.nth(1);
    filteredCity = (await chip.textContent())?.trim();
    await chip.click();
    await page.waitForLoadState("networkidle");
    assertNoBadHost(page.url());
    const hasCityQuery = page.url().includes("city=");
    step("presence_city_filter", hasCityQuery, { note: `chip=${filteredCity} url=${page.url()}` });
    await shot(page, "03-presence-city");
  } else {
    step("presence_city_filter", false, { note: "no city chips beyond 全部" });
  }

  const mapLink = page.locator('a[href*="anitabi.cn/map"]').first();
  if (await mapLink.count()) {
    const href = await mapLink.getAttribute("href");
    step("presence_anitabi_deeplink", Boolean(href && href.includes("bangumiId=")), {
      note: href,
    });
    // Click a title / stay on presence: open map in popup then close
    const [popup] = await Promise.all([
      context.waitForEvent("page", { timeout: 8000 }).catch(() => null),
      mapLink.click({ modifiers: [] }),
    ]);
    if (popup) {
      await popup.waitForLoadState("domcontentloaded").catch(() => {});
      step("open_anitabi_map_tab", /anitabi\.cn/.test(popup.url()), { note: popup.url() });
      await popup.close();
    } else {
      // same-tab navigation
      await page.waitForTimeout(1500);
      if (/anitabi\.cn/.test(page.url())) {
        step("open_anitabi_map_tab", true, { note: page.url() });
        await page.goBack();
      } else {
        step("open_anitabi_map_tab", true, { note: `href clicked in-place; still ${page.url()}` });
      }
    }
  } else {
    step("presence_anitabi_deeplink", false, { note: "no Anitabi map links — empty presence?" });
  }

  // 4) Library (logged out) + OAuth button
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  assertNoBadHost(page.url());
  const loginBtn = page.getByRole("link", { name: /使用 Bangumi 登录/ });
  const oauthConfigured = (await loginBtn.count()) > 0;
  step("library_oauth_cta", oauthConfigured, {
    note: oauthConfigured ? "Bangumi login CTA present" : "OAuth 未配置 or already logged in",
  });
  await shot(page, "04-library-logged-out");

  // 5) Trips pages (guest)
  await page.goto(`${BASE}/trips/new`, { waitUntil: "networkidle" });
  assertNoBadHost(page.url());
  const tripsNewText = await page.locator("body").innerText();
  step("trips_new_reachable", !/0\.0\.0\.0/.test(page.url()), {
    note: `url=${page.url()} snippet=${tripsNewText.slice(0, 120).replace(/\s+/g, " ")}`,
  });
  await shot(page, "05-trips-new");

  await page.goto(`${BASE}/trips`, { waitUntil: "networkidle" });
  assertNoBadHost(page.url());
  step("trips_list_reachable", page.url().includes("/trips"), { note: page.url() });
  await shot(page, "06-trips");

  // Random-ish nav clicks
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  for (const label of ["我的 Library", "规划行程", "浏览 Presence"]) {
    const link = page.getByRole("link", { name: label }).first();
    if (await link.count()) {
      await link.click();
      await page.waitForLoadState("networkidle");
      assertNoBadHost(page.url());
      step(`nav_click_${label}`, true, { note: page.url() });
      await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    }
  }

  // 6) Account: register or login via Bangumi
  if (BGM_REGISTER) {
    await page.goto("https://bgm.tv/signup", { waitUntil: "networkidle" });
    await shot(page, "07-bgm-signup");
    const body = await page.locator("body").innerText();
    report.account = {
      mode: "register_attempt",
      url: page.url(),
      note: body.slice(0, 400).replace(/\s+/g, " "),
    };
    step("bangumi_signup_page", /注册|signup|Sign/i.test(body) || page.url().includes("signup"), {
      note: page.url(),
    });
  }

  if (oauthConfigured) {
    await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
    await loginBtn.click();
    // May hit interstitial then Bangumi
    await page.waitForTimeout(2500);
    await page.waitForLoadState("networkidle").catch(() => {});
    assertNoBadHost(page.url());
    const onBangumi = /bgm\.tv|bangumi\.tv/.test(page.url());
    step("oauth_redirect_to_bangumi", onBangumi && assertNoBadHost(page.url()), {
      note: page.url(),
    });
    await shot(page, "08-bangumi-oauth");

    if (onBangumi && BGM_EMAIL && BGM_PASSWORD) {
      // Bangumi login form fields vary; try common selectors
      const emailSel = 'input[name="email"], input[name="username"], input[type="email"], #email';
      const passSel = 'input[name="password"], input[type="password"], #password';
      if (await page.locator(emailSel).count()) {
        await page.locator(emailSel).first().fill(BGM_EMAIL);
        await page.locator(passSel).first().fill(BGM_PASSWORD);
        await shot(page, "09-bangumi-filled");
        const submit = page.locator('button[type="submit"], input[type="submit"], button:has-text("登录"), button:has-text("Login")').first();
        await submit.click();
        await page.waitForTimeout(4000);
        await page.waitForLoadState("networkidle").catch(() => {});
        // Authorize app if prompted
        const authorize = page.locator('button:has-text("授权"), button:has-text("同意"), input[value*="授权"], a:has-text("授权")').first();
        if (await authorize.count()) {
          await authorize.click();
          await page.waitForTimeout(3000);
        }
        await page.waitForURL(/antiable-anipin|antiable-traceframe|anipins|library|hosted\.app/, { timeout: 20000 }).catch(() => {});
        assertNoBadHost(page.url());
        await shot(page, "10-after-oauth");

        // Personal data check
        await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
        const libText = await page.locator("body").innerText();
        const heading = (await page.locator("h1").first().textContent())?.trim() || "";
        const personalOk = /的收藏/.test(heading) && !/使用 Bangumi 登录/.test(libText);
        report.personalData = {
          heading,
          url: page.url(),
          snippet: libText.slice(0, 300).replace(/\s+/g, " "),
        };
        step("personal_data_heading", personalOk, { note: heading });

        // Sync library
        const syncBtn = page.getByRole("button", { name: /同步收藏/ });
        if (await syncBtn.count()) {
          await syncBtn.click();
          await page.waitForLoadState("networkidle");
          await shot(page, "11-library-synced");
          const after = await page.locator("h1").first().textContent();
          const meta = await page.locator(".hero p").first().textContent().catch(() => "");
          step("sync_library", /的收藏/.test(after || ""), {
            note: `${after} | ${meta}`,
          });
          report.personalData.afterSync = { heading: after, meta };
        }

        // Filter mapped + start trip
        const mappedFilter = page.getByRole("link", { name: /仅看已映射|显示全部/ }).first();
        if (await mappedFilter.count()) {
          await mappedFilter.click();
          await page.waitForLoadState("networkidle");
          step("library_mapped_filter", true, { note: page.url() });
        }
        const plan = page.getByRole("link", { name: /规划行程/ }).first();
        if (await plan.count()) {
          await plan.click();
          await page.waitForLoadState("networkidle");
          step("open_trips_new_authed", page.url().includes("/trips"), { note: page.url() });
          await shot(page, "12-trips-new-authed");
          // Try create trip if checkboxes exist
          const boxes = page.locator('input[type="checkbox"]');
          const n = await boxes.count();
          if (n > 0) {
            const pick = Math.min(3, n);
            for (let i = 0; i < pick; i++) await boxes.nth(i).check().catch(() => {});
            const create = page.getByRole("button", { name: /创建|生成|提交|保存/ }).first();
            if (await create.count()) {
              await create.click();
              await page.waitForLoadState("networkidle");
              step("create_trip", /\/trips\//.test(page.url()), { note: page.url() });
              await shot(page, "13-trip-created");
            }
          }
        }
        report.account = { mode: "login", email: BGM_EMAIL, loggedIn: personalOk };
      } else {
        step("bangumi_login_form", false, { note: "could not find email/password fields" });
        report.account = { mode: "login_blocked", url: page.url() };
      }
    } else if (onBangumi) {
      step("bangumi_credentials", false, {
        note: "Set BGM_EMAIL and BGM_PASSWORD to complete login + personal-data check",
      });
      report.account = {
        mode: "oauth_reached_bangumi",
        url: page.url(),
        needs: ["BGM_EMAIL", "BGM_PASSWORD"],
      };
    }
  }

  report.consoleErrors = consoleErrors.slice(0, 20);
  report.finishedAt = new Date().toISOString();
  const failed = report.steps.filter((s) => !s.pass);
  const criticalFail = failed.some((s) =>
    ["api_health", "homepage_brand", "library_oauth_cta", "oauth_redirect_to_bangumi"].includes(s.name),
  );
  report.verdict = criticalFail ? "FAIL" : failed.length ? "PASS_WITH_GAPS" : "PASS";
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("\nVERDICT:", report.verdict);
  console.log("Report:", join(OUT, "report.json"));
  await browser.close();
  process.exit(criticalFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  report.verdict = "ERROR";
  report.error = String(err);
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  process.exit(1);
});
