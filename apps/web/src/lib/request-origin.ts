/** Hostnames that are valid listen addresses but invalid in browser redirects. */
function isBindHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return h === "0.0.0.0" || h === "::" || h === "0000:0000:0000:0000:0000:0000:0000:0000";
}

function firstHeaderValue(value: string | null): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

/**
 * Public site origin for redirects behind Cloud Run / App Hosting.
 * Next may build `request.url` from HOSTNAME=0.0.0.0; prefer forwarded headers.
 */
export function getRequestOrigin(request: Request): string {
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const hostHeader = firstHeaderValue(request.headers.get("host"));
  const host = forwardedHost || hostHeader;

  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));

  if (host) {
    const hostname = host.replace(/:\d+$/, "");
    if (!isBindHostname(hostname)) {
      let proto = forwardedProto;
      if (!proto) {
        const local =
          hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
        proto = local ? "http" : "https";
      }
      return `${proto}://${host}`;
    }
  }

  const redirectUri = (process.env.BANGUMI_REDIRECT_URI ?? "").trim();
  if (redirectUri) {
    try {
      return new URL(redirectUri).origin;
    } catch {
      /* ignore */
    }
  }

  const url = new URL(request.url);
  if (isBindHostname(url.hostname)) {
    url.hostname = "localhost";
  }
  return url.origin;
}

/** Build an absolute URL on the public origin (never 0.0.0.0). */
export function absoluteUrl(request: Request, path: string): URL {
  return new URL(path, `${getRequestOrigin(request)}/`);
}

/** Reject cross-site browser requests before they can use the session cookie. */
export function isTrustedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === getRequestOrigin(request);
    } catch {
      return false;
    }
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin" || fetchSite === "same-site";
  return process.env.NODE_ENV !== "production";
}
