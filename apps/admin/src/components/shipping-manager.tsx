"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Checkbox, Alert, Badge } from "@optic/ui";
import { parseMoneyToCents, formatMoney } from "@optic/core";
import { saveZoneAction } from "../server/actions/shipping.js";

interface Zone { id: string; name: string; homeDeliveryCents: number | null; deskDeliveryCents: number | null; freeShippingThresholdCents: number | null; estimatedDaysMin: number; estimatedDaysMax: number; codAllowed: boolean; isActive: boolean; wilayaCount: number }

export function ShippingManager({ zones, currency }: { zones: Zone[]; currency: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [edit, setEdit] = useState<(Zone & { homeInput: string; deskInput: string; freeInput: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  function open(z: Zone) {
    setEdit({ ...z, homeInput: z.homeDeliveryCents != null ? String(z.homeDeliveryCents / 100) : "", deskInput: z.deskDeliveryCents != null ? String(z.deskDeliveryCents / 100) : "", freeInput: z.freeShippingThresholdCents != null ? String(z.freeShippingThresholdCents / 100) : "" });
  }
  function save() {
    if (!edit) return;
    setError(null);
    startTransition(async () => {
      const result = await saveZoneAction({
        id: edit.id,
        homeDeliveryCents: edit.homeInput ? parseMoneyToCents(edit.homeInput, currency) : null,
        deskDeliveryCents: edit.deskInput ? parseMoneyToCents(edit.deskInput, currency) : null,
        freeShippingThresholdCents: edit.freeInput ? parseMoneyToCents(edit.freeInput, currency) : null,
        estimatedDaysMin: edit.estimatedDaysMin, estimatedDaysMax: edit.estimatedDaysMax, codAllowed: edit.codAllowed, isActive: edit.isActive,
      });
      if (result.ok) { setEdit(null); router.refresh(); } else setError(result.error ?? "Erreur");
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Livraison — Zones</h1>
      <p className="text-sm text-muted-foreground">Tarifs domicile / stopdesk par zone (wilayas d&apos;Algérie). §12</p>

      {edit && (
        <Card variant="bordered" padded className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <h2 className="font-heading text-lg font-semibold">{edit.name} <span className="text-sm font-normal text-muted-foreground">({edit.wilayaCount} wilayas)</span></h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label={`Domicile (${currency})`} value={edit.homeInput} onChange={(e) => setEdit({ ...edit, homeInput: e.target.value })} inputMode="decimal" />
            <Input label={`Stopdesk (${currency})`} value={edit.deskInput} onChange={(e) => setEdit({ ...edit, deskInput: e.target.value })} inputMode="decimal" />
            <Input label={`Gratuit dès (${currency})`} value={edit.freeInput} onChange={(e) => setEdit({ ...edit, freeInput: e.target.value })} inputMode="decimal" />
            <Input label="Délai min (jours)" type="number" value={String(edit.estimatedDaysMin)} onChange={(e) => setEdit({ ...edit, estimatedDaysMin: Number(e.target.value) })} />
            <Input label="Délai max (jours)" type="number" value={String(edit.estimatedDaysMax)} onChange={(e) => setEdit({ ...edit, estimatedDaysMax: Number(e.target.value) })} />
          </div>
          <div className="flex gap-4"><Checkbox label="Paiement à la livraison autorisé" checked={edit.codAllowed} onChange={(e) => setEdit({ ...edit, codAllowed: e.target.checked })} /><Checkbox label="Zone active" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /></div>
          <div className="flex gap-2"><Button onClick={save} loading={pending}>Enregistrer</Button><Button variant="outline" onClick={() => setEdit(null)}>Annuler</Button></div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {zones.map((z) => (
          <Card key={z.id} variant="bordered" padded>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{z.name} {!z.isActive && <Badge variant="neutral">Inactive</Badge>}</p>
                <p className="mt-1 text-sm text-muted-foreground">Domicile {z.homeDeliveryCents != null ? formatMoney(z.homeDeliveryCents, currency) : "—"} · Stopdesk {z.deskDeliveryCents != null ? formatMoney(z.deskDeliveryCents, currency) : "—"}</p>
                <p className="text-xs text-muted-foreground">{z.wilayaCount} wilayas · {z.estimatedDaysMin}–{z.estimatedDaysMax} j · {z.codAllowed ? "COD ✓" : "COD ✗"}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => open(z)}>Modifier</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
