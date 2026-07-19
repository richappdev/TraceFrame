import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "./session";

/**
 * OAuth CSRF state is stored in the same `__session` cookie Firebase Hosting
 * allows through to Cloud Run. It is replaced by the real session after callback.
 */
export { COOKIE_NAME as OAUTH_STATE_COOKIE } from "./session";

export interface OAuthStatePayload {
  /** CSRF nonce */
  n: string;
  /** Expiry epoch ms */
  e: number;
  /** redirect_uri used in authorize (must match token exchange) */
  r: string;
  /** Interface locale to restore after the external OAuth round trip. */
  l?: string;
  /** Optional same-origin path to continue to after login. */
  p?: string;
}

export function normalizeReturnPath(value: string | null | undefined): string | undefined {
  if (!value || value.length > 500 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return undefined;
  }
  try {
    const url = new URL(value, "https://traceframe.local");
    return url.origin === "https://traceframe.local"
      ? `${url.pathname}${url.search}`
      : undefined;
  } catch {
    return undefined;
  }
}

/** Create CSRF state embedding redirect_uri: `payload.sig`. */
export function createOAuthState(
  redirectUri: string,
  ttlMs = 10 * 60 * 1000,
  locale?: string,
  returnPath?: string,
): string {
  const payload: OAuthStatePayload = {
    n: randomBytes(16).toString("hex"),
    e: Date.now() + ttlMs,
    r: redirectUri,
    l: locale,
    p: normalizeReturnPath(returnPath),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Verify signed state; returns payload or null if tampered/expired/malformed. */
export function parseOAuthState(state: string | null | undefined): OAuthStatePayload | null {
  if (!state) return null;
  const dot = state.indexOf(".");
  if (dot <= 0 || dot === state.length - 1) return null;
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expect = createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthStatePayload;
    if (!payload?.n || !payload?.r || !Number.isFinite(payload.e)) return null;
    if (Date.now() > payload.e) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyOAuthState(state: string | null | undefined): boolean {
  return parseOAuthState(state) != null;
}
