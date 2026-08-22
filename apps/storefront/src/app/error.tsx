"use client";
import { ErrorState } from "@optic/ui";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <div className="py-24"><ErrorState title="Une erreur est survenue" description="Veuillez réessayer." onRetry={reset} /></div>;
}
