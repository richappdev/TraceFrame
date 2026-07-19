import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Firebase Hosting → Cloud Run only forwards a cookie named `__session`
 * (all other Cookie headers are stripped). Keep this name exactly.
 * @see https://firebase.google.com/docs/hosting/manage-cache#using_cookies
 */
const COOKIE_NAME = "__session";

export interface SessionUser {
  id: string;
  bangumiUserId: number;
  username?: string;
  nickname?: string;
  avatar?: string;
}

export interface SessionData {
  user: SessionUser;
  accessTokenEnc: string;
  refreshTokenEnc?: string;
  tokenExpiresAt?: number;
  issuedAt?: number;
  expiresAt?: number;
}

const DEVELOPMENT_SECRET = "dev-only-change-me-to-a-long-random-string";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function getSessionSecret(): string {
  const secret = (process.env.SESSION_SECRET ?? "").trim();
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters in production");
  }
  return secret || DEVELOPMENT_SECRET;
}

function secretKey(): Buffer {
  return createHash("sha256").update(getSessionSecret()).digest();
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptToken(payload: string): string {
  const buf = Buffer.from(payload, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function encodeSessionCookie(data: SessionData): string {
  const issuedAt = Date.now();
  const payload = {
    ...data,
    issuedAt: data.issuedAt ?? issuedAt,
    expiresAt: data.expiresAt ?? issuedAt + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function decodeSessionCookie(raw: string | undefined): SessionData | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expect = createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
  const actualBuffer = Buffer.from(sig, "base64url");
  const expectedBuffer = Buffer.from(expect, "base64url");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionData;
    if (decoded.expiresAt != null && decoded.expiresAt <= Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSec = 60 * 60 * 24 * 30) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export { COOKIE_NAME };
