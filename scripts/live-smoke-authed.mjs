/**
 * Authenticated live smoke using an existing AniPins session cookie.
 *
 * From the logged-in Chrome tab → DevTools → Application → Cookies →
 * copy value of `__session`, then:
 *
 *   $env:ANTIABLE_SESSION='paste-value-here'
 *   node scripts/live-smoke-authed.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE =
  process.env.ANIPINS_URL ||
  process.env.TRACEFRAME_URL ||
  "https://antiable-anipin.web.app";
const OUT = join(process.cwd(), "reports", "live-smoke-authed");
const SESSION = (process.env.ANTIABLE_SESSION || "").trim();

mkdirSync(OUT, { recursive: true });

const report = {
  base: BASE,
  startedAt: new Date().toISOString(),
  steps: [],
  bugs: [],
  personalData: null,
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
  if (/0\.0\.0\.0/.test(url)) {
    report.bugs.push({ type: "bad_redirect_host", url });
    return false;
  }
  return true;
}

async function main() {
  if (!SESSION) {
    console.error(
      "Missing ANTIABLE_SESSION. Copy it from DevTools → Application → Cookies on the live site.",
    );
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "zh-CN",
    viewport: { width: 1280, height: 900 },
  });
  await context.addCookies([
    {
      name: "__session",
      value: SESSION,
      url: BASE,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // Health
  const healthRes = await page.request.get(`${BASE}/api/health`);
  const health = await healthRes.json();
  step("api_health", healthRes.ok() && health.ok === true && health.service === "anipins", {
    note: JSON.stringify(health),
  });

  // Library — personal data
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  assertNoBadHost(page.url());
  const libH1 = ((await page.locator("h1").first().textContent()) || "").trim();
  const libBody = await page.locator("body").innerText();
  const loggedIn = /的收藏/.test(libH1) && !/使用 Bangumi 登录/.test(libBody);
  report.personalData = {
    heading: libH1,
    url: page.url(),
    snippet: libBody.slice(0, 400).replace(/\s+/g, " "),
  };
  step("personal_data_heading", loggedIn, { note: libH1 });
  await shot(page, "01-library");

  if (!loggedIn) {
    report.verdict = "FAIL";
    report.account = { mode: "session_invalid_or_expired" };
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(1);
  }

  // Sync library
  const syncBtn = page.getByRole("button", { name: /同步收藏/ });
  if (await syncBtn.count()) {
    await syncBtn.click();
    await page.waitForLoadState("networkidle");
    const afterH1 = ((await page.locator("h1").first().textContent()) || "").trim();
    const meta = ((await page.locator(".hero p").first().textContent().catch(() => "")) || "").trim();
    report.personalData.afterSync = { heading: afterH1, meta };
    step("sync_library", /的收藏/.test(afterH1), { note: `${afterH1} | ${meta}` });
    await shot(page, "02-library-synced");
  } else {
    step("sync_library", false, { note: "同步收藏 button missing" });
  }

  // Mapped filter toggle
  const mappedFilter = page.getByRole("link", { name: /仅看已映射|显示全部/ }).first();
  if (await mappedFilter.count()) {
    const label = ((await mappedFilter.textContent()) || "").trim();
    await mappedFilter.click();
    await page.waitForLoadState("networkidle");
    step("library_mapped_filter", page.url().includes("/library"), {
      note: `${label} → ${page.url()}`,
    });
    await shot(page, "03-library-filtered");
  }

  // Presence UX while authed
  await page.goto(`${BASE}/presence`, { waitUntil: "networkidle" });
  const chips = page.locator(".city-chips a");
  const chipCount = await chips.count();
  step("presence_authed", chipCount > 0, { note: `chips=${chipCount}` });
  if (chipCount > 1) {
    await chips.nth(Math.min(2, chipCount - 1)).click();
    await page.waitForLoadState("networkidle");
    step("presence_city_click", page.url().includes("city="), { note: page.url() });
  }
  const mapLink = page.locator('a[href*="anitabi.cn/map"]').first();
  if (await mapLink.count()) {
    const href = await mapLink.getAttribute("href");
    step("presence_map_link", Boolean(href?.includes("bangumiId=")), { note: href });
  }
  await shot(page, "04-presence");

  // Trips new — create trip
  await page.goto(`${BASE}/trips/new`, { waitUntil: "networkidle" });
  assertNoBadHost(page.url());
  const tripH1 = ((await page.locator("h1").first().textContent()) || "").trim();
  step("trips_new_authed", tripH1.includes("规划行程") && !/使用 Bangumi 登录/.test(await page.locator("body").innerText()), {
    note: tripH1,
  });
  await shot(page, "05-trips-new");

  const titleInput = page.locator('input[name="title"]');
  const boxes = page.locator('input[type="checkbox"][name="subjectId"]');
  const n = await boxes.count();
  if ((await titleInput.count()) && n > 0) {
    const smokeTitle = `Smoke ${new Date().toISOString().slice(0, 16)}`;
    await titleInput.fill(smokeTitle);
    const pick = Math.min(2, n);
    for (let i = 0; i < pick; i++) await boxes.nth(i).check();
    await page.getByRole("button", { name: /生成行程/ }).click();
    await page.waitForLoadState("networkidle");
    const onTrip = /\/trips\/[^/]+/.test(page.url()) && !page.url().includes("/trips/new");
    step("create_trip", onTrip, { note: page.url() });
    await shot(page, "06-trip-created");

    if (onTrip) {
      // Save edits if present
      const saveBtn = page.getByRole("button", { name: /保存/ });
      if (await saveBtn.count()) {
        await saveBtn.click();
        await page.waitForLoadState("networkidle");
        step("save_trip", true, { note: page.url() });
        await shot(page, "07-trip-saved");
      }
      // Share link
      const share = page.locator('a[href^="/t/"]').first();
      if (await share.count()) {
        const shareHref = await share.getAttribute("href");
        await page.goto(new URL(shareHref, BASE).toString(), { waitUntil: "networkidle" });
        step("share_view", page.url().includes("/t/"), { note: page.url() });
        await shot(page, "08-share");
      }
    }
  } else {
    step("create_trip", false, { note: `checkboxes=${n}` });
  }

  // Trips list
  await page.goto(`${BASE}/trips`, { waitUntil: "networkidle" });
  const tripsText = await page.locator("body").innerText();
  step("trips_list", !/使用 Bangumi 登录/.test(tripsText), {
    note: tripsText.slice(0, 200).replace(/\s+/g, " "),
  });
  await shot(page, "09-trips-list");

  report.consoleErrors = consoleErrors.slice(0, 20);
  report.finishedAt = new Date().toISOString();
  const failed = report.steps.filter((s) => !s.pass);
  report.verdict = failed.some((s) =>
    ["api_health", "personal_data_heading", "sync_library"].includes(s.name),
  )
    ? "FAIL"
    : failed.length
      ? "PASS_WITH_GAPS"
      : "PASS";

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("\nVERDICT:", report.verdict);
  console.log("Personal:", report.personalData?.heading);
  console.log("Report:", join(OUT, "report.json"));
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
