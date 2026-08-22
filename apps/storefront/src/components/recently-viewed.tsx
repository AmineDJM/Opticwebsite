"use client";

import { useEffect } from "react";

/** Records the viewed product id in localStorage for the "recently viewed" rail (§9). */
export function RecentlyViewedTracker({ productId }: { productId: string }) {
  useEffect(() => {
    try {
      const key = "optic_recently_viewed";
      const list: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
      const next = [productId, ...list.filter((id) => id !== productId)].slice(0, 12);
      localStorage.setItem(key, JSON.stringify(next));
    } catch { /* ignore */ }
  }, [productId]);
  return null;
}
