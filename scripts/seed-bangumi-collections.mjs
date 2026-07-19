/**
 * Seed Bangumi anime collections (wish/do/collect) via interest form,
 * then OAuth + sync on AniPins.
 *
 * Env: BGM_CHII_AUTH, BGM_CHII_SID, BGM_CHII_SEC_ID
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE =
  process.env.ANIPINS_URL ||
  process.env.TRACEFRAME_URL ||
  "https://antiable-anipin.web.app";
const OUT = join(process.cwd(), "reports", "live-smoke-seed-library");
const CHII_AUTH = (process.env.BGM_CHII_AUTH || "").trim();
const CHII_SID = (process.env.BGM_CHII_SID || "").trim();
const CHII_SEC_ID = (process.env.BGM_CHII_SEC_ID || "").trim();

/**
 * Only Bangumi type=2 (anime) IDs that also exist in AniPins Presence,
 * plus 摇曳露营△ (207195) for a well-known title.
 * interest: 1 wish / 2 collect(看过) / 3 do(在看)
 */
const SEED = [
  { id: 115908, interest: 3, status: "do", title: "吹响吧！上低音号" },
  { id: 265, interest: 2, status: "collect", title: "新世纪福音战士" },
  { id: 364450, interest: 1, status: "wish", title: "莉可丽丝" },
  { id: 428735, interest: 3, status: "do", title: "MyGO!!!!!" },
  { id: 207195, interest: 1, status: "wish", title: "摇曳露营△" },
  { id: 218707, interest: 2, status: "collect", title: "少女终末旅行" },
];

mkdirSync(OUT, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  seeds: [],
  steps: [],
  personalData: null,
  verdict: "UNKNOWN",
};

function step(name, pass, detail = {}) {
  report.steps.push({ name, pass, ...detail, at: new Date().toISOString() });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail.note ? ` — ${detail.note}` : ""}`);
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

async function setInterest(page, item) {
  await page.goto(`https://bgm.tv/subject/${item.id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const form = page.locator("#collectBoxForm");
  if (!(await form.count())) {
    return { ok: false, mode: "no_form", url: page.url() };
  }

  const action = await form.getAttribute("action");
  if (!action) return { ok: false, mode: "no_action", url: page.url() };

  // Prefer direct form submit (more reliable than thickbox clicks)
  await page.evaluate(
    ({ interest }) => {
      const form = document.querySelector("#collectBoxForm");
      if (!form) return;
      const radio = form.querySelector(`input[name="interest"][value="${interest}"]`);
      if (radio) radio.checked = true;
      const comment = form.querySelector("#comment, textarea[name='comment']");
      if (comment) comment.value = "antiable smoke seed";
      const tags = form.querySelector("#tags, input[name='tags']");
      if (tags && !tags.value) tags.value = "smoke";
    },
    { interest: item.interest },
  );

  await Promise.all([
    page.waitForLoadState("networkidle"),
    form.evaluate((f) => {
      const btn = f.querySelector('input[type="submit"][name="update"], input.inputBtn');
      if (btn) btn.click();
      else f.submit();
    }),
  ]).catch(() => {});

  await page.waitForTimeout(1000);

  // Verify: reload and see if interest radio is checked or status shown
  await page.goto(`https://bgm.tv/subject/${item.id}`, { waitUntil: "networkidle" });
  const verified = await page.evaluate((interest) => {
    const checked = document.querySelector(`#collectBoxForm input[name="interest"][value="${interest}"]:checked`);
    const tip = document.querySelector("#SecTab, .collectInfo, .interest_block");
    return {
      radioChecked: Boolean(checked),
      tipText: tip ? (tip.textContent || "").replace(/\s+/g, " ").slice(0, 120) : "",
    };
  }, item.interest);

  return {
    ok: verified.radioChecked || /修改|看过|在看|想看|读过|在读|想读/.test(verified.tipText),
    mode: "form_submit",
    url: page.url(),
    action,
    verified,
  };
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

  const cookies = [
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
    cookies.push({
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
    cookies.push({
      name: "chii_sec_id",
      value: CHII_SEC_ID,
      domain: ".bgm.tv",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    });
  }
  await context.addCookies(cookies);
  const page = await context.newPage();

  await page.goto("https://bgm.tv/settings", { waitUntil: "networkidle" });
  const settingsOk = !/login/.test(page.url());
  const nick =
    (await page.locator("#nickname, input[name='nickname']").inputValue().catch(() => "")) || "";
  step("bangumi_session", settingsOk, { note: `nick=${nick || "?"}` });
  if (!settingsOk) {
    report.verdict = "FAIL";
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(1);
  }

  let okCount = 0;
  for (let i = 0; i < SEED.length; i++) {
    const item = SEED[i];
    const result = await setInterest(page, item);
    await shot(page, `${String(i + 1).padStart(2, "0")}-${item.id}-${item.status}`);
    report.seeds.push({ ...item, ...result });
    step(`seed_${item.status}_${item.id}`, result.ok, {
      note: `${item.title} interest=${item.interest} mode=${result.mode} checked=${result.verified?.radioChecked}`,
    });
    if (result.ok) okCount++;
    await page.waitForTimeout(500 + Math.floor(Math.random() * 700));
  }
  step("seed_batch", okCount >= 3, { note: `${okCount}/${SEED.length}` });

  // AniPins OAuth + sync
  await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
  const loginBtn = page.getByRole("link", { name: /使用 Bangumi 登录/ });
  if (await loginBtn.count()) {
    await loginBtn.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);
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
  const syncBtn = page.getByRole("button", { name: /同步收藏/ });
  if (await syncBtn.count()) {
    await syncBtn.click();
    await page.waitForLoadState("networkidle");
  }
  const afterH1 = ((await page.locator("h1").first().textContent()) || "").trim();
  const meta = ((await page.locator(".hero p").first().textContent().catch(() => "")) || "").trim();
  const mappedBadges = await page.locator(".badge.mapped, span.badge:has-text('已映射')").count();
  const unmapped = await page.locator("span.badge:has-text('未映射')").count();
  const libText = await page.locator("body").innerText();
  report.personalData = { heading: afterH1, meta, mappedBadges, unmapped };
  const countMatch = meta.match(/共\s*(\d+)\s*部/);
  const syncedCount = countMatch ? Number(countMatch[1]) : 0;
  step("sync_library", syncedCount > 0, {
    note: `${afterH1} | ${meta} | mapped=${mappedBadges} unmapped=${unmapped}`,
  });
  await shot(page, "90-library-synced");

  for (const t of ["上低音号", "莉可丽丝", "MyGO", "摇曳露营", "少女终末", "福音战士"]) {
    if (libText.includes(t)) step(`library_has_${t}`, true);
  }

  report.finishedAt = new Date().toISOString();
  const failed = report.steps.filter((s) => !s.pass);
  report.verdict = failed.some((s) => ["bangumi_session", "seed_batch", "sync_library"].includes(s.name))
    ? "FAIL"
    : failed.length
      ? "PASS_WITH_GAPS"
      : "PASS";
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("\nVERDICT:", report.verdict);
  console.log("Library:", report.personalData);
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
