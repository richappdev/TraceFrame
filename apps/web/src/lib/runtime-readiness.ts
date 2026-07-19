import { getBangumiOAuthConfig } from "./bangumi-oauth";
import { openAppStore } from "./db";
import { getSessionSecret } from "./session";

export function validateProductionConfiguration(): void {
  if (process.env.NODE_ENV !== "production") return;

  if (process.env.APP_STORE !== "firestore") {
    throw new Error("APP_STORE=firestore is required in production");
  }
  getSessionSecret();

  const clientId = (process.env.BANGUMI_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.BANGUMI_CLIENT_SECRET ?? "").trim();
  const redirectRaw = (process.env.BANGUMI_REDIRECT_URI ?? "").trim();
  if (!clientId || !clientSecret || !redirectRaw) {
    throw new Error("Bangumi OAuth production configuration is incomplete");
  }

  let redirect: URL;
  try {
    redirect = new URL(redirectRaw);
  } catch {
    throw new Error("BANGUMI_REDIRECT_URI must be an absolute URL");
  }
  if (redirect.protocol !== "https:" || redirect.pathname !== "/api/auth/callback") {
    throw new Error("BANGUMI_REDIRECT_URI must use HTTPS and end at /api/auth/callback");
  }

  const config = getBangumiOAuthConfig();
  if (!config.configured) {
    throw new Error("Bangumi OAuth production configuration is incomplete");
  }
}

export async function checkRuntimeReadiness(): Promise<void> {
  validateProductionConfiguration();
  const store = openAppStore();
  try {
    await store.healthCheck();
  } finally {
    await store.close();
  }
}
