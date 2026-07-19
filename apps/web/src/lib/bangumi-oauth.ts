const AUTH_BASE = "https://bgm.tv/oauth";
const API_BASE = "https://api.bgm.tv";

const DEFAULT_REDIRECT_URI = "http://localhost:3000/api/auth/callback";
const TOKEN_EXCHANGE_ATTEMPTS = 2;

function envTrim(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function getBangumiOAuthConfig() {
  const clientId = envTrim("BANGUMI_CLIENT_ID");
  const clientSecret = envTrim("BANGUMI_CLIENT_SECRET");
  // Empty string must not win over the default (`??` only catches null/undefined).
  const redirectUri = envTrim("BANGUMI_REDIRECT_URI") || DEFAULT_REDIRECT_URI;
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret && redirectUri),
  };
}

export function buildAuthorizeUrl(state: string, redirectUriOverride?: string): string {
  const { clientId, redirectUri: configured } = getBangumiOAuthConfig();
  const redirectUri = redirectUriOverride || configured;
  if (!redirectUri) {
    throw new Error("BANGUMI_REDIRECT_URI is required");
  }
  const url = new URL(`${AUTH_BASE}/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  // Must match the callback URL saved on https://bgm.tv/dev/app
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  refresh_token?: string;
  user_id: number;
}

function isTokenResponse(value: unknown): value is TokenResponse {
  if (!value || typeof value !== "object") return false;
  const token = value as Partial<TokenResponse>;
  return (
    typeof token.access_token === "string" &&
    token.access_token.length > 0 &&
    typeof token.expires_in === "number" &&
    Number.isFinite(token.expires_in)
  );
}

export async function exchangeCode(
  code: string,
  redirectUriOverride?: string,
): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri: configured } = getBangumiOAuthConfig();
  const redirectUri = redirectUriOverride || configured;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  for (let attempt = 1; attempt <= TOKEN_EXCHANGE_ATTEMPTS; attempt += 1) {
    const res = await fetch(`${AUTH_BASE}/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      // Bangumi's token endpoint can intermittently return 5xx. A single retry
      // keeps a valid, one-time authorization code from becoming a dead end.
      if (res.status >= 500 && attempt < TOKEN_EXCHANGE_ATTEMPTS) continue;
      throw new Error(`Bangumi token exchange failed: ${res.status} ${text.slice(0, 200)}`);
    }

    const token: unknown = await res.json();
    if (!isTokenResponse(token)) {
      throw new Error("Bangumi token exchange returned an invalid response");
    }
    return token;
  }

  throw new Error("Bangumi token exchange failed after retry");
}

export interface BangumiMe {
  id: number;
  username: string;
  nickname: string;
  avatar?: { large?: string; medium?: string; small?: string };
}

export async function fetchBangumiMe(accessToken: string): Promise<BangumiMe> {
  const ua =
    process.env.BANGUMI_USER_AGENT ??
    "antiable/trip (0.1.0) (https://github.com/antiable/trip)";
  const res = await fetch(`${API_BASE}/v0/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": ua,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bangumi /v0/me failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as BangumiMe;
}
