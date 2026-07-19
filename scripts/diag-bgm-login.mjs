import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "reports", "live-10min");
mkdirSync(OUT, { recursive: true });
const AUTH = process.env.BGM_CHII_AUTH;
const SID = process.env.BGM_CHII_SID || "";
const SEC = process.env.BGM_CHII_SEC_ID || "";
const BASE = process.env.ANIPINS_URL || "https://antiable-anipin.web.app";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: "zh-CN", viewport: { width: 1280, height: 900 } });
await ctx.addCookies([
  { name: "chii_auth", value: AUTH, domain: ".bgm.tv", path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
  ...(SID ? [{ name: "chii_sid", value: SID, domain: ".bgm.tv", path: "/", httpOnly: true, secure: true, sameSite: "Lax" }] : []),
  ...(SEC ? [{ name: "chii_sec_id", value: SEC, domain: ".bgm.tv", path: "/", httpOnly: true, secure: true, sameSite: "Lax" }] : []),
]);
const page = await ctx.newPage();
await page.goto("https://bgm.tv/settings", { waitUntil: "networkidle" });
const settingsUrl = page.url();
const nick = await page.locator("#nickname, input[name='nickname']").inputValue().catch(() => "");
await page.screenshot({ path: join(OUT, "diag-bgm-settings.png"), fullPage: true });

await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: /使用 Bangumi 登录/ }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(2000);
const afterLoginClick = page.url();
await page.screenshot({ path: join(OUT, "diag-oauth.png"), fullPage: true });
const body = (await page.locator("body").innerText()).slice(0, 500).replace(/\s+/g, " ");

const report = { settingsUrl, nick, afterLoginClick, body, authLen: AUTH?.length };
writeFileSync(join(OUT, "diag-login.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
