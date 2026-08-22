"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

/**
 * Favorite toggle island shown on product cards. Uses a guest-friendly localStorage
 * wishlist so it works without an account; when logged in the account page reconciles.
 */
export function ProductCardActions({ productId }: { productId: string }) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    try {
      const set = new Set<string>(JSON.parse(localStorage.getItem("optic_favorites") ?? "[]"));
      setFav(set.has(productId));
    } catch { /* ignore */ }
  }, [productId]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const set = new Set<string>(JSON.parse(localStorage.getItem("optic_favorites") ?? "[]"));
      if (set.has(productId)) set.delete(productId);
      else set.add(productId);
      localStorage.setItem("optic_favorites", JSON.stringify([...set]));
      setFav(set.has(productId));
    } catch { /* ignore */ }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={fav}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
    >
      <Heart size={18} fill={fav ? "currentColor" : "none"} className={fav ? "text-error" : ""} />
    </button>
  );
}
