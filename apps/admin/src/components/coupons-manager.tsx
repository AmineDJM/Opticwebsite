"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Card, Button, Input, Select, Checkbox, Badge, Alert } from "@optic/ui";
import { parseMoneyToCents } from "@optic/core";
import { saveCouponAction, deleteCouponAction } from "../server/actions/catalog-admin.js";

interface Coupon { id: string; code: string; type: string; value: number; minSubtotalCents: number; maxDiscountCents: number | null; usageLimit: number | null; usageCount: number; isActive: boolean }

export function CouponsManager({ coupons, currency }: { coupons: Coupon[]; currency: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<(Partial<Coupon> & { minInput?: string; maxInput?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!editing) return;
    setError(null);
    const minSubtotalCents = editing.minInput ? parseMoneyToCents(editing.minInput, currency) ?? 0 : 0;
    const maxDiscountCents = editing.maxInput ? parseMoneyToCents(editing.maxInput, currency) : null;
    startTransition(async () => {
      const result = await saveCouponAction({ ...editing, minSubtotalCents, maxDiscountCents });
      if (result.ok) { setEditing(null); router.refresh(); } else setError(result.error ?? "Erreur");
    });
  }

  const label = (c: Coupon) => c.type === "PERCENTAGE" ? `${c.value}%` : c.type === "FIXED" ? `${c.value / 100} ${currency}` : "Livraison offerte";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Promotions</h1>
        <Button onClick={() => setEditing({ type: "PERCENTAGE", value: 10, isActive: true })}><Plus size={18} /> Nouveau code</Button>
      </div>

      {editing && (
        <Card variant="bordered" padded className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Code" value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} />
            <Select label="Type" value={editing.type ?? "PERCENTAGE"} onChange={(e) => setEditing({ ...editing, type: e.target.value })} options={[{ value: "PERCENTAGE", label: "Pourcentage" }, { value: "FIXED", label: "Montant fixe" }, { value: "FREE_SHIPPING", label: "Livraison offerte" }]} />
            {editing.type !== "FREE_SHIPPING" && <Input label={editing.type === "PERCENTAGE" ? "Valeur (%)" : `Valeur (centimes)`} type="number" value={String(editing.value ?? 0)} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })} />}
            <Input label={`Minimum d'achat (${currency})`} value={editing.minInput ?? ""} onChange={(e) => setEditing({ ...editing, minInput: e.target.value })} inputMode="decimal" />
            {editing.type === "PERCENTAGE" && <Input label={`Remise max (${currency})`} value={editing.maxInput ?? ""} onChange={(e) => setEditing({ ...editing, maxInput: e.target.value })} inputMode="decimal" />}
            <Input label="Limite d'utilisation" type="number" value={String(editing.usageLimit ?? "")} onChange={(e) => setEditing({ ...editing, usageLimit: e.target.value ? Number(e.target.value) : null })} hint="Vide = illimité" />
          </div>
          <Checkbox label="Actif" checked={editing.isActive ?? true} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
          <div className="flex gap-2"><Button onClick={save} loading={pending}>Enregistrer</Button><Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button></div>
        </Card>
      )}

      <div className="overflow-x-auto rounded border border-border bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Code</th><th className="p-3">Valeur</th><th className="p-3">Utilisé</th><th className="p-3">Statut</th><th className="p-3"></th></tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="p-3 font-mono font-medium">{c.code}</td>
                <td className="p-3">{label(c)}</td>
                <td className="p-3">{c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                <td className="p-3"><Badge variant={c.isActive ? "success" : "neutral"}>{c.isActive ? "Actif" : "Inactif"}</Badge></td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing({ ...c, minInput: String(c.minSubtotalCents / 100), maxInput: c.maxDiscountCents ? String(c.maxDiscountCents / 100) : "" })} aria-label="Modifier" className="rounded p-1.5 hover:bg-muted"><Pencil size={16} /></button>
                  <button onClick={() => confirm(`Supprimer ${c.code} ?`) && startTransition(async () => { await deleteCouponAction(c.id); router.refresh(); })} aria-label="Supprimer" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-error"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
