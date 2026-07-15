import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const COOKIE_NAME = "antiable_session";

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
}

function secretKey(): Buffer {
  const secret = process.env.SESSION_SECRET ?? "dev-only-change-me-to-a-long-random-string";
  return createHash("sha256").update(secret).digest();
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
  const body = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const sig = createHash("sha256")
    .update(body + (process.env.SESSION_SECRET ?? "dev-only"))
    .digest("base64url");
  return `${body}.${sig}`;
}

export function decodeSessionCookie(raw: string | undefined): SessionData | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expect = createHash("sha256")
    .update(body + (process.env.SESSION_SECRET ?? "dev-only"))
    .digest("base64url");
  if (expect !== sig) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionData;
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
