"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Soft-refresh the library while Anitabi verify queue items are still checking. */
export function LibraryRefreshWhileChecking({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      router.refresh();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [enabled, router]);

  return null;
}
