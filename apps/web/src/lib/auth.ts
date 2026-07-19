import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  decodeSessionCookie,
  decryptToken,
  type SessionData,
} from "@/lib/session";

export async function getSession(): Promise<SessionData | null> {
  const jar = await cookies();
  return decodeSessionCookie(jar.get(COOKIE_NAME)?.value);
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session?.accessTokenEnc) return null;
  if (session.tokenExpiresAt != null && session.tokenExpiresAt <= Date.now() + 30_000) {
    // Bangumi's official API reference does not document a refresh-token grant.
    // Fail closed and require a new OAuth login instead of guessing a token flow.
    return null;
  }
  try {
    return decryptToken(session.accessTokenEnc);
  } catch {
    return null;
  }
}
