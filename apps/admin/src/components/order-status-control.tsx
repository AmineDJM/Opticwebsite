"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Textarea, Alert } from "@optic/ui";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@optic/commerce";
import { changeStatusAction } from "../server/actions/orders.js";

/** Order status change control (§13). Offers only valid next states; adds an optional note. */
export function OrderStatusControl({ orderId, current, transitions }: { orderId: string; current: OrderStatus; transitions: OrderStatus[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function change(to: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await changeStatusAction({ orderId, to, note: note || undefined });
      if (result.ok) { setNote(""); router.refresh(); }
      else setError(result.error ?? "Erreur");
    });
  }

  return (
    <Card variant="bordered" padded>
      <h2 className="mb-3 font-heading text-lg font-semibold">Changer le statut</h2>
      <p className="mb-3 text-sm text-muted-foreground">Statut actuel : <strong>{ORDER_STATUS_LABELS[current]}</strong></p>
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (facultatif)" rows={2} className="mb-3" aria-label="Note de statut" />
      <div className="flex flex-col gap-2">
        {transitions.map((to) => (
          <Button key={to} variant={to === "CANCELLED" || to === "RETURNED" || to === "FAILED_DELIVERY" ? "outline" : "primary"} onClick={() => change(to)} loading={pending} block>
            → {ORDER_STATUS_LABELS[to]}
          </Button>
        ))}
      </div>
    </Card>
  );
}
