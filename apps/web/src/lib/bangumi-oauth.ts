const AUTH_BASE = "https://bgm.tv/oauth";
const API_BASE = "https://api.bgm.tv";

export function getBangumiOAuthConfig() {
  const clientId = process.env.BANGUMI_CLIENT_ID ?? "";
  const clientSecret = process.env.BANGUMI_CLIENT_SECRET ?? "";
  const redirectUri =
    process.env.BANGUMI_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback";
  return { clientId, clientSecret, redirectUri, configured: Boolean(clientId && clientSecret) };
}

export function buildAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getBangumiOAuthConfig();
  const url = new URL(`${AUTH_BASE}/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
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

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getBangumiOAuthConfig();
  const res = await fetch(`${AUTH_BASE}/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bangumi token exchange failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as TokenResponse;
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
