"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

/** Dismissible announcement bar (§45.1). Remembers dismissal in localStorage. */
export function AnnouncementBar({ text, href }: { text: string; href?: string }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem("optic_announcement_dismissed") === text);
    } catch {
      setDismissed(false);
    }
  }, [text]);

  if (dismissed) return null;

  const content = <span className="text-center">{text}</span>;

  return (
    <div className="relative bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-container items-center justify-center px-10 py-2 text-sm">
        {href ? <Link href={href} className="hover:underline">{content}</Link> : content}
      </div>
      <button
        type="button"
        aria-label="Fermer"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-white/15"
        onClick={() => {
          try { localStorage.setItem("optic_announcement_dismissed", text); } catch { /* ignore */ }
          setDismissed(true);
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
