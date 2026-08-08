/**
 * Read-only daily production smoke for GitHub Actions.
 *
 * The report intentionally excludes response bodies, cookies, OAuth state, and
 * other potentially sensitive values. Set ANIPINS_URL to check another host.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = new URL(process.env.ANIPINS_URL || "https://antiable-anipin.web.app");
const OUT = join(process.cwd(), "reports", "daily-smoke");
const SUPPORTED_LOCALES = ["zh-CN", "zh-TW", "ja-JP"];

mkdirSync(OUT, { recursive: true });

const report = {
  base: BASE.origin,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  verdict: "UNKNOWN",
  steps: [],
};

let page;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replaceAll(BASE.origin, "<target>").slice(0, 500);
}

async function screenshot(name) {
  if (!page || page.isClosed()) return null;
  const filename = `${name}.png`;
  const path = join(OUT, filename);
  await page.screenshot({ path, fullPage: true }).catch(() => {});
  return `reports/daily-smoke/${filename}`;
}

async function check(name, operation) {
  const started = Date.now();
  try {
    const detail = (await operation()) || {};
    report.steps.push({
      name,
      pass: true,
      durationMs: Date.now() - started,
      ...detail,
    });
    console.log(`PASS  ${name}`);
  } catch (error) {
    const screenshotPath = await screenshot(`failure-${name}`);
    report.steps.push({
      name,
      pass: false,
      durationMs: Date.now() - started,
      error: safeError(error),
      screenshot: screenshotPath,
    });
    console.error(`FAIL  ${name}: ${safeError(error)}`);
  }
}

async function goto(path) {
  const response = await page.goto(new URL(path, BASE).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  assert(response, `No document response for ${path}`);
  return response;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "zh-CN",
    viewport: { width: 1280, height: 800 },
  });
  page = await context.newPage();
  page.setDefaultTimeout(10_000);

  await check("health", async () => {
    const response = await page.request.get(new URL("/api/health", BASE).toString(), {
      timeout: 20_000,
    });
    assert(response.status() === 200, `Expected HTTP 200, got ${response.status()}`);
    const health = await response.json();
    assert(health.ok === true, "Health response is not ok");
    assert(health.service === "anipins", "Unexpected service name");
    assert(health.appStore === "firestore", "Production app store is not Firestore");
    assert(health.dependencies?.appStore === "ready", "App store dependency is not ready");
    return {
      status: response.status(),
      service: health.service,
      appStore: health.appStore,
      dependency: health.dependencies.appStore,
    };
  });

  await check("root_locale_redirect", async () => {
    const response = await goto("/");
    const finalUrl = new URL(page.url());
    const locale = SUPPORTED_LOCALES.find(
      (candidate) =>
        finalUrl.pathname === `/${candidate}` || finalUrl.pathname.startsWith(`/${candidate}/`),
    );
    assert(response.ok(), `Expected a successful page, got ${response.status()}`);
    assert(locale, `Root did not resolve to a supported locale: ${finalUrl.pathname}`);
    return { status: response.status(), locale };
  });

  for (const locale of SUPPORTED_LOCALES) {
    await check(`home_${locale}`, async () => {
      const response = await goto(`/${locale}`);
      assert(response.ok(), `Expected HTTP 2xx, got ${response.status()}`);
      const brand = (await page.locator(".hero-brand").first().textContent())?.trim();
      assert(brand === "ANIPINS", `Expected ANIPINS brand, got ${brand || "nothing"}`);
      return { status: response.status() };
    });
  }

  await check("presence", async () => {
    const response = await goto("/zh-CN/presence");
    assert(response.ok(), `Expected HTTP 2xx, got ${response.status()}`);
    const cityCount = await page.locator(".city-chips a").count();
    assert(cityCount > 0, "No Presence city filters found");
    const mapLink = page.locator('a[href*="anitabi.cn/map"]').first();
    assert((await mapLink.count()) > 0, "No Anitabi map link found");
    const href = await mapLink.getAttribute("href");
    assert(href, "Anitabi map link has no href");
    const mapUrl = new URL(href);
    assert(mapUrl.hostname === "anitabi.cn", "Map link points to an unexpected host");
    assert(/^\d+$/.test(mapUrl.searchParams.get("bangumiId") || ""), "Map link has no Bangumi ID");
    assert(
      (await page.locator("body").innerText()).includes("Anitabi"),
      "Anitabi attribution is missing",
    );
    return { status: response.status(), cityFilters: cityCount };
  });

  await check("explore_index", async () => {
    const response = await goto("/zh-CN/trips/explore");
    assert(response.ok(), `Expected HTTP 2xx, got ${response.status()}`);
    const knownTrip = page.locator('a[href*="/trips/explore/kyoto-uji-classics"]').first();
    assert((await knownTrip.count()) > 0, "Known curated trip is missing from Explore");
    return { status: response.status() };
  });

  await check("explore_known_trip", async () => {
    const response = await goto("/zh-CN/trips/explore/kyoto-uji-classics");
    assert(response.ok(), `Expected HTTP 2xx, got ${response.status()}`);
    assert((await page.locator("h1").count()) > 0, "Known curated trip has no heading");
    return { status: response.status() };
  });

  await check("explore_not_found", async () => {
    const response = await goto("/zh-CN/trips/explore/daily-smoke-not-a-real-trip");
    assert(response.status() === 404, `Expected HTTP 404, got ${response.status()}`);
    return { status: response.status() };
  });

  await check("library_login_entry", async () => {
    const response = await goto("/zh-CN/library");
    assert(response.ok(), `Expected HTTP 2xx, got ${response.status()}`);
    const login = page.locator('a[href^="/api/auth/bangumi"]').first();
    assert((await login.count()) > 0, "Bangumi login entry point is missing");
    return { status: response.status() };
  });

  await browser.close();

  const failures = report.steps.filter((step) => !step.pass);
  report.finishedAt = new Date().toISOString();
  report.verdict = failures.length === 0 ? "PASS" : "FAIL";
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));

  console.log(`\nVERDICT: ${report.verdict}`);
  console.log(`Report: ${join(OUT, "report.json")}`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch(async (error) => {
  report.finishedAt = new Date().toISOString();
  report.verdict = "ERROR";
  report.steps.push({ name: "runner", pass: false, error: safeError(error) });
  await screenshot("failure-runner");
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.error(`ERROR: ${safeError(error)}`);
  process.exitCode = 1;
});
