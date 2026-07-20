"use client";

import { useEffect } from "react";
import { SITE_ACCESS_CACHE_TTL_MS } from "@/lib/site-access-constants";

/**
 * While the normal shell is showing, re-check the access flag on the same
 * interval as the server cache so already-open (including signed-in) tabs
 * reload into the blocked notice soon after Console publish.
 */
export function SiteAccessWatcher() {
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch("/api/site-access", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { blocked?: boolean };
        if (data.blocked) window.location.reload();
      } catch {
        // Fail-open: keep the current page if the check fails.
      }
    }

    const id = window.setInterval(check, SITE_ACCESS_CACHE_TTL_MS);
    const onFocus = () => { void check(); };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
